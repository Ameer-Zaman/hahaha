import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import Plate from '../../components/media/Plate'
import GangsLoading from './components/GangsLoading'
import RollText from '../../components/ui/RollText'
import Arrow from '../../components/ui/Arrow'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { formatFileNumber, useGangFiles } from './gangsModel'
import CardVideo from './components/CardVideo'
import './gangs.css'
import './gang-page.css'

const OUTCOME = {
  win: { label: 'Won', short: 'W' },
  loss: { label: 'Lost', short: 'L' },
  draw: { label: 'Drawn', short: 'D' },
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?'

const isLeaderRole = (role = '') => /leader|president|boss|head|founder|don/i.test(role)

/**
 * A gang's own page — its file in the archive: a full-screen title scene, the numbers at a
 * glance, the intel (leader, territory, founded), then the war record as a timeline and the
 * roster as cards. Everything comes from the confirmed data; anything not supplied yet says
 * so plainly. Player names are plain text (no profile pages).
 */
export default function GangPage() {
  const { slug } = useParams()
  const { ready, files } = useGangFiles()
  const index = files.findIndex((f) => f.slug === slug)
  const file = index >= 0 ? files[index] : null
  usePageTitle(file ? file.title : ready ? 'Gang not found' : 'Gangs')

  if (!ready) return <GangsLoading label="Loading gang" />
  if (!file) return <GangNotFound />

  const prev = files[(index - 1 + files.length) % files.length]
  const next = files[(index + 1) % files.length]
  return <GangDetail key={file.slug} file={file} prev={prev} next={next} total={files.length} />
}

/* ---------------------------------------------------------------- icons */
const Icon = {
  crown: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4z" />
      <path d="M4 21h16" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  ),
  flag: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  ),
  swords: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4l9 9M20 4l-9 9M7 17l-3 3M17 17l3 3M9 15l-2 2M15 15l2 2" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.6 5.2" />
    </svg>
  ),
}

function GangDetail({ file, prev, next, total }) {
  const root = useRef(null)
  const [rolled, setRolled] = useState(false)
  const { record } = file
  const played = record.wars.length
  const winRate = played ? Math.round((record.wins / played) * 100) : 0
  const form = record.wars.slice(0, 5).reverse() // oldest → newest, the last five
  const accent = { gold: 'gold', blue: 'blue', crimson: 'crimson' }[file.scene.tint] ?? 'gold'

  useEffect(() => {
    const id = window.setTimeout(() => setRolled(true), 250)
    return () => window.clearTimeout(id)
  }, [])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        // the title scene
        gsap.from('.gx-hero__plate', { scale: 1.12, duration: 2.2, ease: 'power2.out' })
        gsap.from('.gx-hero__copy > *', { y: 28, opacity: 0, duration: 0.9, stagger: 0.08, delay: 0.15, ease: 'power3.out' })
        gsap.from('.gx-hero__num', { xPercent: 12, opacity: 0, duration: 1.4, delay: 0.3, ease: 'power3.out' })
        gsap.to('.gx-hero__plate', {
          yPercent: 14,
          ease: 'none',
          scrollTrigger: { trigger: '.gx-hero', start: 'top top', end: 'bottom top', scrub: true },
        })

        // the numbers count up, the win-rate ring draws, as the band comes into view
        ScrollTrigger.create({
          trigger: '.gx-stats',
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.utils.toArray('[data-count]').forEach((el) => {
              const to = Number(el.dataset.count)
              const state = { v: 0 }
              gsap.to(state, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(state.v)) })
            })
            gsap.fromTo('.gx-ring__value', { strokeDashoffset: 100 }, { strokeDashoffset: 100 - winRate, duration: 1.6, ease: 'power3.out' })
          },
        })

        // sections and cards rise in as they're reached
        // (set hidden first, then animate *to* place, so a card can never be left half-way)
        gsap.set('.gx-reveal', { y: 26, opacity: 0 })
        ScrollTrigger.batch('.gx-reveal', {
          start: 'top 92%',
          once: true,
          onEnter: (els) =>
            gsap.to(els, { y: 0, opacity: 1, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity' }),
        })

        // the timeline's spine draws down as you read
        gsap.from('.gx-timeline__spine', {
          scaleY: 0,
          ease: 'none',
          scrollTrigger: { trigger: '.gx-timeline', start: 'top 75%', end: 'bottom 60%', scrub: 0.6 },
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} className={`gx gx--${accent}`}>
      {/* ---------------- the title scene ---------------- */}
      <header className="gx-hero">
        <div className="gx-hero__media" aria-hidden="true">
          <Plate className="gx-hero__plate" image={file.image} seed={file.scene.seed} horizon={file.scene.horizon} priority>
            {file.video && <CardVideo src={file.video} playing delay={0} />}
          </Plate>
        </div>
        <div className="gx-hero__shade" aria-hidden="true" />
        <span className="gx-hero__num" aria-hidden="true">
          {formatFileNumber(file.number)}
        </span>

        <div className="container gx-hero__inner">
          <Link to="/gangs" state={{ focus: file.slug }} className="gx-back">
            <span aria-hidden="true">«</span> All gangs
          </Link>

          <div className="gx-hero__copy">
            {file.demo && <span className="gx-demo">Demo data — not real</span>}
            <p className="gx-hero__label">
              <span className="gx-dot" aria-hidden="true" />
              {file.type}
              <span className="gx-hero__sep" aria-hidden="true">
                /
              </span>
              File {formatFileNumber(file.number)} of {formatFileNumber(total)}
            </p>
            <h1 className="gx-hero__title">
              <RollText text={file.title} rolled={rolled} />
            </h1>
            {file.headline && <p className="gx-hero__line">“{file.headline}”</p>}
          </div>
        </div>
      </header>

      <div className="container gx-body">
        {/* ---------------- numbers ---------------- */}
        <section className="gx-stats gx-reveal" aria-label="At a glance">
          <div className="gx-stat gx-stat--ring">
            <svg className="gx-ring" viewBox="0 0 40 40" aria-hidden="true">
              <circle className="gx-ring__track" cx="20" cy="20" r="15.9" pathLength="100" />
              <circle className="gx-ring__value" cx="20" cy="20" r="15.9" pathLength="100" style={{ strokeDashoffset: 100 - winRate }} />
            </svg>
            <div>
              <p className="gx-stat__value">
                <span data-count={winRate}>{winRate}</span>%
              </p>
              <p className="gx-stat__label">Win rate</p>
            </div>
          </div>
          <div className="gx-stat">
            <p className="gx-stat__value">
              <span data-count={played}>{played}</span>
            </p>
            <p className="gx-stat__label">Wars</p>
          </div>
          <div className="gx-stat gx-stat--win">
            <p className="gx-stat__value">
              <span data-count={record.wins}>{record.wins}</span>
            </p>
            <p className="gx-stat__label">Won</p>
          </div>
          <div className="gx-stat gx-stat--loss">
            <p className="gx-stat__value">
              <span data-count={record.losses}>{record.losses}</span>
            </p>
            <p className="gx-stat__label">Lost</p>
          </div>
          <div className="gx-stat">
            <p className="gx-stat__value">
              <span data-count={file.members.length}>{file.members.length}</span>
            </p>
            <p className="gx-stat__label">Players</p>
          </div>
        </section>

        {/* ---------------- intel ---------------- */}
        <section className="gx-intel" aria-label="Gang details">
          {[
            ['Leader', file.leader, Icon.crown],
            ['Territory', file.territory, Icon.pin],
            ['Established', file.established, Icon.flag],
          ].map(([label, value, icon]) => (
            <div key={label} className="gx-intel__item gx-reveal">
              <span className="gx-intel__icon">{icon}</span>
              <div>
                <p className="gx-intel__label">{label}</p>
                <p className="gx-intel__value">{value}</p>
              </div>
            </div>
          ))}
        </section>

        {!file.reserved && file.description && <p className="gx-about gx-reveal">{file.description}</p>}

        {form.length > 0 && (
          <div className="gx-form gx-reveal" aria-label={`Recent form: ${form.map((w) => OUTCOME[w.outcome].label).join(', ')}`}>
            <span className="gx-form__label">Recent form</span>
            <span className="gx-form__chips" aria-hidden="true">
              {form.map((w) => (
                <span key={w.id} className={`gx-chip gx-chip--${w.outcome}`}>
                  {OUTCOME[w.outcome].short}
                </span>
              ))}
            </span>
          </div>
        )}

        {/* ---------------- record + roster ---------------- */}
        <div className="gx-grid">
          <section className="gx-panel" aria-labelledby="gx-wars">
            <header className="gx-panel__head gx-reveal">
              <span className="gx-panel__icon">{Icon.swords}</span>
              <h2 id="gx-wars" className="gx-panel__title">
                War record
              </h2>
              {played > 0 && (
                <p className="gx-panel__tally">
                  <b className="is-win">{record.wins}W</b> <b className="is-loss">{record.losses}L</b> <b>{record.draws}D</b>
                </p>
              )}
            </header>
            {played === 0 ? (
              <p className="gx-empty gx-reveal">No wars on record yet. When this gang fights, the result is logged here.</p>
            ) : (
              <ol role="list" className="gx-timeline">
                <span className="gx-timeline__spine" aria-hidden="true" />
                {record.wars.map((war) => (
                  <li key={war.id} className={`gx-war gx-war--${war.outcome} gx-reveal`}>
                    <span className="gx-war__node" aria-hidden="true" />
                    <div className="gx-war__card">
                      <p className="gx-war__date">{formatDate(war.date)}</p>
                      <p className="gx-war__vs">
                        <span className="gx-war__vs-word">vs</span>
                        {war.opponentSlug ? <Link to={`/gangs/${war.opponentSlug}`}>{war.opponent}</Link> : war.opponent}
                      </p>
                      {war.result && <p className="gx-war__result">{war.result}</p>}
                      <span className={`gx-badge gx-badge--${war.outcome}`}>{OUTCOME[war.outcome].label}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="gx-panel" aria-labelledby="gx-players">
            <header className="gx-panel__head gx-reveal">
              <span className="gx-panel__icon">{Icon.users}</span>
              <h2 id="gx-players" className="gx-panel__title">
                Roster
              </h2>
              {file.members.length > 0 && <p className="gx-panel__tally">{file.members.length} players</p>}
            </header>
            {file.members.length === 0 ? (
              <p className="gx-empty gx-reveal">
                {file.reserved ? 'This file is sealed until the administration confirms the gang.' : 'Roster not published yet.'}
              </p>
            ) : (
              <ol role="list" className="gx-roster">
                {file.members.map((member, i) => {
                  const lead = i === 0 ? isLeaderRole(member.role) || member.name === file.leader : isLeaderRole(member.role)
                  return (
                    <li key={`${member.name}-${i}`} className={`gx-member gx-reveal ${lead ? 'is-lead' : ''}`}>
                      <span className="gx-member__mono" aria-hidden="true">
                        {initials(member.name)}
                      </span>
                      <span className="gx-member__text">
                        <span className="gx-member__name">{member.name}</span>
                        <span className="gx-member__role">
                          {lead && <span className="gx-member__crown">{Icon.crown}</span>}
                          {member.role ?? 'Member'}
                        </span>
                      </span>
                      <span className="gx-member__num" aria-hidden="true">
                        {formatFileNumber(i + 1)}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>

        {/* ---------------- other files ---------------- */}
        {total > 1 && (
          <nav className="gx-pager" aria-label="Other gangs">
            <Link to={`/gangs/${prev.slug}`} className="gx-pager__link gx-reveal">
              <span className="gx-pager__dir">
                <span aria-hidden="true">«</span> Previous file · {formatFileNumber(prev.number)}
              </span>
              <span className="gx-pager__name">{prev.title}</span>
            </Link>
            <Link to={`/gangs/${next.slug}`} className="gx-pager__link gx-pager__link--next gx-reveal">
              <span className="gx-pager__dir">
                Next file · {formatFileNumber(next.number)} <span aria-hidden="true">»</span>
              </span>
              <span className="gx-pager__name">{next.title}</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  )
}

function GangNotFound() {
  return (
    <section className="page-head theme-black" aria-labelledby="gnf-title" style={{ minHeight: '80svh' }}>
      <div className="container">
        <h1 id="gnf-title" className="page-head__title">
          No file by that name
        </h1>
        <p className="lede">This gang isn’t in the archive. It may not be confirmed yet, or the address is wrong.</p>
        <div style={{ marginTop: 'var(--sp-7)' }}>
          <Link to="/gangs" className="btn btn--primary btn--large">
            See all gangs <Arrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
