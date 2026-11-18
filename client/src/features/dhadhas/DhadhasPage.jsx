import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import './dhadhas.css'

const CREW_MAX = 10
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

/** The crew by rank position (1 first); players without one after, in the panel's order. */
const byRank = (members) =>
  members.map((m, i) => ({ ...m, order: i })).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.order - b.order)

const newestFirst = (fights) => [...fights].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

/** Everything the stage shows about one Dhadha, worked out once. */
function profile(d) {
  const crew = byRank(d.members)
  const fights = crew.flatMap((m) => m.fights)
  return {
    crew,
    coins: crew.reduce((sum, m) => sum + (m.coins || 0), 0),
    record: record(fights),
    fights: fights.length,
    top: crew.find((m) => m.rank) ?? null,
  }
}

/**
 * Dhadhas — a fighter-select screen.
 *
 * The stage shows one Dhadha: his portrait in a slanted frame, his name huge and outlined
 * behind him, and a dossier (title, line, crew filled out of 10, coins, the crew's record).
 * The roster below lists every Dhadha as a slanted tile: pointing at one previews him,
 * choosing one selects him (and gives him his own address, /dhadhas/<dhadha>); the arrow keys
 * move along the roster. Under the stage his crew fills ten slots, best ranked first; each
 * player's card turns over to show their fights.
 */
export default function DhadhasPage() {
  const entry = usePublic('/dhadhas')
  const list = useMemo(() => (entry.status === 'ok' ? (entry.data?.dhadhas ?? []) : []), [entry])
  const { slug } = useParams()
  const navigate = useNavigate()
  const chosen = (slug && list.find((d) => d.id === slug)) || list[0] || null
  usePageTitle(slug && chosen ? `${chosen.name} · Dhadhas` : 'Dhadhas')

  // a link to a Dhadha who isn't there (any more): back to the first
  useEffect(() => {
    if (slug && entry.status === 'ok' && !list.some((d) => d.id === slug)) navigate('/dhadhas', { replace: true })
  }, [slug, entry.status, list, navigate])

  const select = (d) => navigate(`/dhadhas/${d.id}`, { replace: true, preventScrollReset: true })

  return (
    <div className="dx theme-black">
      {entry.status === 'loading' && <StageSkeleton />}
      {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
        <section className="dx-stage dx-stage--plain">
          <div className="container">
            <h1 className="dx-kicker">Dhadhas</h1>
            <p className="dx-note" role="status">
              The Dhadhas can’t be loaded right now. Try again in a moment.
            </p>
          </div>
        </section>
      )}
      {entry.status === 'ok' && list.length === 0 && (
        <section className="dx-stage dx-stage--plain">
          <div className="container">
            <h1 className="dx-kicker">Dhadhas</h1>
            <p className="dx-empty__title">The Dhadhas are on their way</p>
            <p className="dx-note">Who they are and who rides with them will be announced on our Discord.</p>
            <ApplyLink className="btn btn--primary">Get updates on Discord</ApplyLink>
          </div>
        </section>
      )}
      {entry.status === 'ok' && chosen && <Select list={list} chosen={chosen} onSelect={select} />}
    </div>
  )
}

/* ------------------------------------------------------------- the select screen */

function Select({ list, chosen, onSelect }) {
  const [preview, setPreview] = useState(null) // the Dhadha being pointed at, shown without choosing him
  const shown = preview ?? chosen
  const place = list.indexOf(shown)
  const info = useMemo(() => profile(shown), [shown])
  const chosenInfo = useMemo(() => profile(chosen), [chosen])

  return (
    <>
      <section className="dx-stage" aria-labelledby="dx-title">
        <div className="dx-stage__grain" aria-hidden="true" />
        <div className="container dx-stage__inner">
          <header className="dx-top">
            <h1 id="dx-title" className="dx-kicker">
              <span className="dx-kicker__mark" aria-hidden="true" />
              <span className="visually-hidden">Dhadhas — </span>
              Choose your Dhadha
            </h1>
            <p className="dx-top__count" aria-hidden="true">
              {two(place + 1)} <span>/ {two(list.length)}</span>
            </p>
          </header>

          {/* keyed on the Dhadha, so every change plays the entrance again */}
          <div key={shown.id} className="dx-show">
            <p className="dx-bigname" aria-hidden="true">
              {[...shown.name.toUpperCase()].map((ch, i) => (
                <span key={i} style={{ '--i': i }}>
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </p>

            <figure className="dx-portrait">
              <span className="dx-portrait__glow" aria-hidden="true" />
              <span className="dx-portrait__frame">
                {shown.photo ? (
                  <img src={shown.photo} alt={`${shown.name}`} decoding="async" />
                ) : (
                  <span className="dx-portrait__initial" aria-hidden="true">
                    {initial(shown.name)}
                  </span>
                )}
                <span className="dx-portrait__slash" aria-hidden="true" />
              </span>
            </figure>

            <div className="dx-dossier">
              <p className="dx-dossier__title">{shown.title || 'Dhadha'}</p>
              <h2 className="dx-dossier__name">{shown.name}</h2>
              {shown.line && <p className="dx-dossier__line">“{shown.line}”</p>}

              <dl className="dx-stats">
                <div className="dx-stat">
                  <dt>Crew</dt>
                  <dd>
                    <span className="dx-stat__value">
                      {info.crew.length}
                      <small>/{CREW_MAX}</small>
                    </span>
                    <span className="dx-pips" aria-hidden="true">
                      {Array.from({ length: CREW_MAX }, (_, i) => (
                        <i key={i} className={i < info.crew.length ? 'is-on' : ''} style={{ '--i': i }} />
                      ))}
                    </span>
                  </dd>
                </div>
                <div className="dx-stat">
                  <dt>Coins</dt>
                  <dd>
                    <span className="dx-stat__value">{number.format(info.coins)}</span>
                  </dd>
                </div>
                <div className="dx-stat">
                  <dt>Record</dt>
                  <dd>
                    {info.fights ? (
                      <>
                        <span className="dx-stat__value">
                          {info.record.win}
                          <small>W</small> {info.record.loss}
                          <small>L</small>
                          {info.record.draw ? (
                            <>
                              {' '}
                              {info.record.draw}
                              <small>D</small>
                            </>
                          ) : null}
                        </span>
                        <span className="dx-split" aria-hidden="true">
                          <i className="dx-split__w" style={{ flexGrow: info.record.win }} />
                          <i className="dx-split__d" style={{ flexGrow: info.record.draw }} />
                          <i className="dx-split__l" style={{ flexGrow: info.record.loss }} />
                        </span>
                      </>
                    ) : (
                      <span className="dx-stat__value dx-stat__value--none">No fights yet</span>
                    )}
                  </dd>
                </div>
                {info.top && (
                  <div className="dx-stat">
                    <dt>Crew No. 1</dt>
                    <dd>
                      <span className="dx-stat__value dx-stat__value--text">{info.top.name}</span>
                    </dd>
                  </div>
                )}
              </dl>
              {preview && preview.id !== chosen.id && <p className="dx-dossier__hint">Click to choose</p>}
            </div>
          </div>

          <Roster list={list} chosen={chosen} onSelect={onSelect} onPreview={setPreview} />
        </div>
      </section>

      <Crew key={chosen.id} dhadha={chosen} crew={chosenInfo.crew} />
    </>
  )
}

/** Every Dhadha as a slanted tile. Arrow keys move along it and choose as they go. */
function Roster({ list, chosen, onSelect, onPreview }) {
  const refs = useRef([])
  const index = list.indexOf(chosen)

  // keep the chosen tile in view on a narrow, scrolling roster
  useEffect(() => {
    const tile = refs.current[index]
    const strip = tile?.parentElement?.parentElement
    if (tile && strip && strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: tile.offsetLeft - strip.clientWidth / 2 + tile.offsetWidth / 2, behavior: 'smooth' })
    }
  }, [index])

  function onKey(e) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    let next = null
    if (step) next = (index + step + list.length) % list.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = list.length - 1
    if (next === null) return
    e.preventDefault()
    onSelect(list[next])
    refs.current[next]?.focus()
  }

  return (
    <nav className="dx-roster" aria-label="All Dhadhas">
      <ul className="dx-roster__list" role="list" onPointerLeave={() => onPreview(null)}>
        {list.map((d, i) => {
          const on = d.id === chosen.id
          return (
            <li key={d.id} className="dx-tile-wrap">
              <button
                ref={(el) => (refs.current[i] = el)}
                type="button"
                className={`dx-tile${on ? ' is-on' : ''}`}
                aria-current={on ? 'true' : undefined}
                tabIndex={on ? 0 : -1}
                onClick={() => {
                  onPreview(null)
                  onSelect(d)
                }}
                onPointerEnter={(e) => e.pointerType === 'mouse' && onPreview(d)}
                onKeyDown={onKey}
              >
                <span className="dx-tile__img" aria-hidden="true">
                  {d.photo ? <img src={d.photo} alt="" loading="lazy" decoding="async" /> : <b>{initial(d.name)}</b>}
                </span>
                <span className="dx-tile__no" aria-hidden="true">
                  {two(i + 1)}
                </span>
                <span className="dx-tile__name">{d.name}</span>
                {on && <span className="dx-tile__tag">Selected</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* ------------------------------------------------------------------ his crew */

function Crew({ dhadha: d, crew }) {
  const empty = Math.max(0, CREW_MAX - crew.length)
  return (
    <section className="dx-crew section" aria-labelledby="dx-crew-title">
      <div className="container">
        <header className="dx-crew__head">
          <h2 id="dx-crew-title" className="dx-crew__title">
            <span>{d.name}’s</span> crew
          </h2>
          <p className="dx-note">
            {crew.length
              ? `${crew.length} of ${CREW_MAX} slots filled, best ranked first. Turn a card over for that player’s fights.`
              : 'His crew hasn’t been announced yet.'}
          </p>
        </header>
        <ol className="dx-slots" role="list">
          {crew.map((m, i) => (
            <Card key={`${m.name}-${i}`} member={m} index={i} />
          ))}
          {Array.from({ length: empty }, (_, i) => (
            <li key={`empty-${i}`} className="dx-slot dx-slot--empty" style={{ '--i': crew.length + i }} aria-hidden="true">
              <span className="dx-slot__lock" />
              <span>Empty slot</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/**
 * One player: a card whose back lists their fights. Clicking anywhere on it turns it over; the
 * button in its corner does the same for keyboards and screen readers. The hidden face is inert.
 */
function Card({ member: m, index }) {
  const [flipped, setFlipped] = useState(false)
  const r = record(m.fights)
  const fights = useMemo(() => newestFirst(m.fights), [m.fights])
  const form = fights.slice(0, 5)
  const turn = () => setFlipped((v) => !v)
  return (
    <li className={`dx-slot${flipped ? ' is-flipped' : ''}`} style={{ '--i': index }}>
      {/* the whole card turns on click; the button below is the accessible way to do it */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="dx-card" onClick={(e) => !e.target.closest('button') && turn()}>
        <article className="dx-card__face dx-card__front" inert={flipped} aria-label={m.name}>
          <span className="dx-card__rank">
            {m.rank ? two(m.rank) : '—'}
            <span className="visually-hidden">{m.rank ? `, rank ${m.rank}` : ', not ranked yet'}</span>
          </span>
          <span className="dx-card__photo" aria-hidden="true">
            {m.photo ? <img src={m.photo} alt="" loading="lazy" decoding="async" /> : <b>{initial(m.name)}</b>}
          </span>
          <span className="dx-card__info">
            <h3 className="dx-card__name">{m.name}</h3>
            <span className="dx-card__coins">
              {number.format(m.coins || 0)} <small>coins</small>
            </span>
            <span className="dx-form">
              <span className="visually-hidden">Last fights, newest first: </span>
              {form.length ? (
                form.map((f, k) => (
                  <i key={k} className={`dx-form__${f.result}`}>
                    {f.result === 'win' ? 'W' : f.result === 'loss' ? 'L' : 'D'}
                  </i>
                ))
              ) : (
                <small>No fights yet</small>
              )}
            </span>
          </span>
        </article>

        <section className="dx-card__face dx-card__back" inert={!flipped} aria-label={`${m.name}’s fights`}>
          <p className="dx-card__backhead">
            <span>{m.name}</span>
            <span>
              {r.win}W {r.loss}L{r.draw ? ` ${r.draw}D` : ''}
            </span>
          </p>
          {fights.length === 0 ? (
            <p className="dx-card__none">No fights recorded yet.</p>
          ) : (
            <ul className="dx-card__fights" role="list">
              {fights.map((f, k) => (
                <li key={k} className={`dx-bout dx-bout--${f.result}`}>
                  <span className="dx-bout__res">{f.result === 'win' ? 'Won' : f.result === 'loss' ? 'Lost' : 'Draw'}</span>
                  <span className="dx-bout__vs">vs {f.opponent}</span>
                  {f.date && (
                    <time className="dx-bout__date" dateTime={f.date}>
                      {formatDay(f.date)}
                    </time>
                  )}
                  {f.note && <span className="dx-bout__note">{f.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <button type="button" className="dx-card__flip" aria-pressed={flipped} onClick={turn}>
        {flipped ? 'Card' : 'Fights'}
        <span className="visually-hidden"> — {m.name}</span>
      </button>
    </li>
  )
}

function StageSkeleton() {
  return (
    <section className="dx-stage dx-stage--plain">
      <SkeletonGroup label="Loading the Dhadhas" className="container dx-skel">
        <Skeleton w="12rem" h="1rem" />
        <div className="dx-skel__row">
          <Skeleton w="100%" h="26rem" radius={0} />
          <div className="dx-skel__col">
            <Skeleton w="60%" h="3rem" />
            <Skeleton w="80%" h="1rem" />
            <Skeleton w="70%" h="1rem" />
            <Skeleton w="50%" h="1rem" />
          </div>
        </div>
        <Skeleton w="100%" h="6rem" radius={0} />
      </SkeletonGroup>
    </section>
  )
}
