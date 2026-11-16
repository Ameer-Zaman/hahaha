import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

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

/** Wins, losses and draws in a list of fights. */
const record = (fights) => ({
  win: fights.filter((f) => f.result === 'win').length,
  loss: fights.filter((f) => f.result === 'loss').length,
  draw: fights.filter((f) => f.result === 'draw').length,
})

/** The crew by rank position (1 first); players without one after, in the panel's order. */
const byRank = (members) =>
  members.map((m, i) => ({ ...m, order: i })).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.order - b.order)

/**
 * Dhadhas — every Dhadha as a card. Opening one shows his crew (up to 10 players) by rank
 * position with their coins and record; opening a player shows their fights, newest first.
 *
 * The crew opens in a pop-up with its own address (/dhadhas/<dhadha>), like an event's
 * details over the events list, so it can be shared and Back closes it.
 */
export default function DhadhasPage() {
  const entry = usePublic('/dhadhas')
  const list = entry.status === 'ok' ? (entry.data?.dhadhas ?? []) : []
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const shown = slug ? list.find((d) => d.id === slug) : null
  usePageTitle(shown ? `${shown.name} · Dhadhas` : 'Dhadhas')
  const close = () => (location.state?.fromList ? navigate(-1) : navigate('/dhadhas', { replace: true }))

  // a link to a Dhadha who isn't there (any more): just show the list
  useEffect(() => {
    if (slug && entry.status === 'ok' && !shown) navigate('/dhadhas', { replace: true })
  }, [slug, entry.status, shown, navigate])

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="dhadhas-title">
        <ParallaxWord text="Dhadhas" motion="x:6%:-10%" className="page-head__word" />
        <div className="container">
          <h1 id="dhadhas-title" className="page-head__title">
            Dhadhas
          </h1>
          <p className="lede">Every Dhadha and his crew. Open a card to see each player’s rank, coins and fights.</p>
        </div>
      </ParallaxScope>

      <section className="dh theme-black section" aria-label="All Dhadhas">
        <div className="container">
          {entry.status === 'loading' && <GridSkeleton />}
          {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
            <p className="dh-note" role="status">
              The Dhadhas can’t be loaded right now. Try again in a moment.
            </p>
          )}
          {entry.status === 'ok' &&
            (list.length === 0 ? (
              <div className="dh-empty">
                <p className="dh-empty__title">The Dhadhas are on their way</p>
                <p className="dh-empty__text">Who they are and who rides with them will be announced on our Discord.</p>
                <ApplyLink className="btn btn--primary">Get updates on Discord</ApplyLink>
              </div>
            ) : (
              <ul className="dh-grid" role="list">
                {list.map((d) => (
                  <li key={d.id}>
                    <DhadhaCard dhadha={d} />
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </section>

      <CrewDialog open={Boolean(shown)} dhadha={shown} onClose={close} />
    </>
  )
}

/* ------------------------------------------------------------------ a Dhadha's card */

function DhadhaCard({ dhadha: d }) {
  const coins = d.members.reduce((sum, m) => sum + (m.coins || 0), 0)
  return (
    <Link to={`/dhadhas/${d.id}`} state={{ fromList: true }} className="dh-card" aria-label={`${d.name} — see his crew`}>
      <span className="dh-card__photo" aria-hidden="true">
        {d.photo ? (
          <img src={d.photo} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="dh-card__initial">{initial(d.name)}</span>
        )}
      </span>
      <span className="dh-card__text">
        <span className="dh-card__title">{d.title || 'Dhadha'}</span>
        <span className="dh-card__name">{d.name}</span>
        <span className="dh-card__meta">
          {d.members.length} {d.members.length === 1 ? 'player' : 'players'} · {number.format(coins)} coins
        </span>
      </span>
      <span className="dh-card__open" aria-hidden="true">
        Crew
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </span>
    </Link>
  )
}

function GridSkeleton() {
  return (
    <SkeletonGroup label="Loading the Dhadhas" className="dh-grid">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} w="100%" h="auto" radius={2} className="dh-card dh-card--skeleton" />
      ))}
    </SkeletonGroup>
  )
}

/* ------------------------------------------------------------------ his crew */

function CrewDialog({ open, dhadha, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.focus() // start on the pop-up itself, not with a focus ring on its × button
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

  return (
    <dialog
      ref={ref}
      className="dhd"
      tabIndex={-1}
      aria-labelledby="dhd-title"
      onCancel={(e) => {
        e.preventDefault() // Esc: close through the address, so Back works as expected
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // a click on the dimmed backdrop
      }}
    >
      {open && dhadha && <Crew key={dhadha.id} dhadha={dhadha} onClose={onClose} />}
    </dialog>
  )
}

function Crew({ dhadha: d, onClose }) {
  const crew = useMemo(() => byRank(d.members), [d.members])
  const [shown, setShown] = useState(null) // the player whose fights are open
  const coins = crew.reduce((sum, m) => sum + (m.coins || 0), 0)
  const r = record(crew.flatMap((m) => m.fights))

  return (
    <div className="dhd__panel">
      <button type="button" className="dhd__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
          <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
        </svg>
      </button>

      <header className="dhd__head">
        <span className="dhd__photo" aria-hidden="true">
          {d.photo ? <img src={d.photo} alt="" /> : initial(d.name)}
        </span>
        <div className="dhd__who">
          <p className="dhd__cat">{d.title || 'Dhadha'}</p>
          <h2 id="dhd-title" className="dhd__title">
            {d.name}
          </h2>
          {d.line && <p className="dhd__line">{d.line}</p>}
        </div>
      </header>

      <dl className="dhd__stats">
        <div>
          <dt>Players</dt>
          <dd>{crew.length}</dd>
        </div>
        <div>
          <dt>Coins</dt>
          <dd>{number.format(coins)}</dd>
        </div>
        <div>
          <dt>Record</dt>
          <dd>
            {r.win}W {r.loss}L{r.draw ? ` ${r.draw}D` : ''}
          </dd>
        </div>
      </dl>

      <div className="dhd__scroll">
        {crew.length === 0 ? (
          <p className="dhd__empty">His crew hasn’t been announced yet.</p>
        ) : (
          <>
            <div className="dhd__cols" aria-hidden="true">
              <span>Rank</span>
              <span>Player</span>
              <span>Coins</span>
            </div>
            <ol className="dhd__list" role="list">
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
          </>
        )}
      </div>
    </div>
  )
}

function Player({ member: m, place, open, onToggle }) {
  const r = record(m.fights)
  const fights = useMemo(() => [...m.fights].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [m.fights])
  const id = `dhd-fights-${place}`
  return (
    <li className={`dhp${open ? ' is-open' : ''}`}>
      <button type="button" className="dhp__row" onClick={onToggle} aria-expanded={open} aria-controls={id}>
        <span className="dhp__rank">
          {m.rank ? String(m.rank).padStart(2, '0') : '—'}
          <span className="visually-hidden">{m.rank ? `, rank ${m.rank}` : ', not ranked yet'}</span>
        </span>
        <span className="dhp__photo" aria-hidden="true">
          {m.photo ? <img src={m.photo} alt="" loading="lazy" decoding="async" /> : initial(m.name)}
        </span>
        <span className="dhp__who">
          <span className="dhp__name">{m.name}</span>
          <span className="dhp__record">{m.fights.length ? `${r.win}W ${r.loss}L${r.draw ? ` ${r.draw}D` : ''}` : 'No fights yet'}</span>
        </span>
        <span className="dhp__coins">
          {number.format(m.coins || 0)}
          <span className="visually-hidden"> coins</span>
        </span>
        <span className="dhp__chev" aria-hidden="true" />
      </button>

      <div id={id} className="dhp__fights" hidden={!open}>
        {fights.length === 0 ? (
          <p className="dhp__none">No fights recorded yet.</p>
        ) : (
          <ul className="dhf" role="list">
            {fights.map((f, k) => (
              <li key={k} className={`dhf__item dhf__item--${f.result}`}>
                <span className="dhf__result">{f.result === 'win' ? 'Won' : f.result === 'loss' ? 'Lost' : 'Draw'}</span>
                <span className="dhf__vs">
                  vs {f.opponent}
                  {f.note && <span className="dhf__note"> — {f.note}</span>}
                </span>
                {f.date && <time dateTime={f.date}>{formatDay(f.date)}</time>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
