import '@fontsource/mr-dafoe/latin-400.css'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import '@fontsource/big-shoulders-display/latin-900'

import { setSmokeColor } from '../../components/cursor/smokeColor'
import Plate from '../../components/media/Plate'
import GangsLoading from './components/GangsLoading'
import Arrow from '../../components/ui/Arrow'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { formatFileNumber, gangTheme, PENDING, useGangFiles } from './gangsModel'
import CardVideo from './components/CardVideo'
import NeonName from './components/NeonName'
import './gangs.css'
import './gang-page.css'

const OUTCOME = {
  win: { label: 'Won', short: 'W' },
  loss: { label: 'Lost', short: 'L' },
  draw: { label: 'No winner', short: '–' },
}

/** A fact the admin hasn't filled in reads as "Not announced yet", quietly, not as a value. */
const shown = (value) => (!value || value === PENDING ? <span className="gx-facts__none">Not announced yet</span> : value)

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
 * A gang's own page, kept minimal: a title scene, the key facts in one line, and two buttons
 * that open the war record and the player list in a pop-up (paged when long). Everything
 * comes from the confirmed data; anything not supplied yet says so plainly.
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

const PAGE_SIZE = 8

function GangDetail({ file, prev, next, total }) {
  const root = useRef(null)
  const [open, setOpen] = useState(null) // 'wars' | 'players' | null
  const { record } = file
  const played = record.wars.length
  const form = record.wars.slice(0, 5).reverse() // the last five, oldest → newest
  const accent = { gold: 'gold', blue: 'blue', crimson: 'crimson' }[file.scene.tint] ?? 'gold'

  // the cursor smoke takes the gang's colour while its page is open, and turns gold again after
  useEffect(() => {
    setSmokeColor(gangTheme(file.color)?.['--c-gold'] ?? null)
    return () => setSmokeColor(null)
  }, [file.color])

  // ← / → on the keyboard go to the previous / next gang (not while typing or in a pop-up)
  const navigate = useNavigate()
  useEffect(() => {
    if (total < 2) return undefined
    const onKey = (e) => {
      if (open || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)
        return
      if (e.key === 'ArrowLeft') navigate(`/gangs/${prev.slug}`)
      if (e.key === 'ArrowRight') navigate(`/gangs/${next.slug}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, prev.slug, next.slug, total, navigate])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('.gx-hero__plate', { scale: 1.1, duration: 2.2, ease: 'power2.out' })
        gsap.from('.gx-hero__copy > *', { y: 24, opacity: 0, duration: 0.9, stagger: 0.08, delay: 0.15, ease: 'power3.out' })
        gsap.from('.gx-summary > *', {
          y: 18,
          opacity: 0,
          duration: 0.7,
          stagger: 0.07,
          delay: 0.45,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        })
        // the numbers count up as the stats come into view
        ScrollTrigger.create({
          trigger: '.gx-stats',
          start: 'top 90%',
          once: true,
          onEnter: () => {
            gsap.utils.toArray('[data-count]').forEach((el) => {
              const to = Number(el.dataset.count)
              const state = { v: 0 }
              gsap.to(state, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(state.v)) })
            })
          },
        })
        gsap.to('.gx-hero__plate', {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: { trigger: '.gx-hero', start: 'top top', end: 'bottom top', scrub: true },
        })
      })

      // the picture tilts in 3D with the mouse (the name drifts the other way, for depth)
      mm.add(`${MOTION_OK} and (hover: hover) and (pointer: fine)`, () => {
        const hero = root.current?.querySelector('.gx-hero')
        const media = hero?.querySelector('.gx-hero__media')
        const copy = hero?.querySelector('.gx-hero__copy')
        if (!hero || !media || !copy) return undefined
        gsap.set(media, { transformPerspective: 1100, scale: 1.1, transformOrigin: '50% 50%' })
        const ease = { duration: 0.9, ease: 'power3.out' }
        const to = {
          rx: gsap.quickTo(media, 'rotationX', ease),
          ry: gsap.quickTo(media, 'rotationY', ease),
          mx: gsap.quickTo(media, 'x', ease),
          my: gsap.quickTo(media, 'y', ease),
          cx: gsap.quickTo(copy, 'x', ease),
          cy: gsap.quickTo(copy, 'y', ease),
        }
        const move = (x, y) => {
          to.ry(x * 9)
          to.rx(-y * 7)
          to.mx(-x * 26)
          to.my(-y * 18)
          to.cx(x * 18)
          to.cy(y * 12)
        }
        const onMove = (e) => {
          const r = hero.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - 0.5
          const y = (e.clientY - r.top) / r.height - 0.5
          move(x, y)
          hero.style.setProperty('--gx-mx', `${((x + 0.5) * 100).toFixed(1)}%`)
          hero.style.setProperty('--gx-my', `${((y + 0.5) * 100).toFixed(1)}%`)
        }
        const onLeave = () => move(0, 0)
        hero.addEventListener('pointermove', onMove)
        hero.addEventListener('pointerleave', onLeave)
        return () => {
          hero.removeEventListener('pointermove', onMove)
          hero.removeEventListener('pointerleave', onLeave)
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} className={`gx gx--${accent}`} style={gangTheme(file.color)}>
      <header className="gx-hero">
        <div className="gx-hero__media" aria-hidden="true">
          <Plate className="gx-hero__plate" image={file.image} seed={file.scene.seed} horizon={file.scene.horizon} priority>
            {file.video && <CardVideo src={file.video} playing delay={0} />}
          </Plate>
          <div className="gx-hero__glare" />
        </div>
        <div className="gx-hero__shade" aria-hidden="true" />
        {total > 1 && (
          <>
            <GangArrow file={prev} dir="prev" />
            <GangArrow file={next} dir="next" />
          </>
        )}

        <div className="container gx-hero__inner">
          <Link to="/gangs" state={{ focus: file.slug }} className="gx-back">
            <span aria-hidden="true">«</span> All gangs
          </Link>
          <div className="gx-hero__copy">
            {file.demo && <span className="gx-demo">Demo data — not real</span>}
            <NeonName as="h1" className="gx-hero__title" text={file.title} />
            {file.headline && <p className="gx-hero__line">“{file.headline}”</p>}
          </div>
        </div>
      </header>

      <div className="container gx-summary">
        <dl className="gx-facts">
          <div>
            <dt>Leader</dt>
            <dd>{shown(file.leader)}</dd>
          </div>
          <div>
            <dt>{file.coLeaders.length === 1 ? 'Co-leader' : 'Co-leaders'}</dt>
            <dd>
              {file.coLeaders.length === 0 ? (
                shown(PENDING)
              ) : (
                <ul role="list" className="gx-facts__names">
                  {file.coLeaders.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
          <div>
            <dt>
              IGL <small className="gx-facts__note">In-game leader</small>
            </dt>
            <dd>{shown(file.igl)}</dd>
          </div>
        </dl>

        {!file.reserved && file.description && <p className="gx-about">{file.description}</p>}

        <section className="gx-stats" aria-label="At a glance">
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

        {form.length > 0 && (
          <div className="gx-form" aria-label={`Recent form: ${form.map((w) => OUTCOME[w.outcome].label).join(', ')}`}>
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

        <div className="gx-actions">
          <button type="button" className="gx-open" onClick={() => setOpen('wars')}>
            <span className="gx-open__icon">{Icon.swords}</span>
            <span className="gx-open__text">
              <span className="gx-open__title">War record</span>
              <span className="gx-open__meta">{played ? `${played} ${played === 1 ? 'war' : 'wars'}` : 'None yet'}</span>
            </span>
            <span className="gx-open__arrow" aria-hidden="true">
              »
            </span>
          </button>
          <button type="button" className="gx-open" onClick={() => setOpen('players')}>
            <span className="gx-open__icon">{Icon.users}</span>
            <span className="gx-open__text">
              <span className="gx-open__title">Players</span>
              <span className="gx-open__meta">{file.members.length ? `${file.members.length} on the roster` : 'Not published yet'}</span>
            </span>
            <span className="gx-open__arrow" aria-hidden="true">
              »
            </span>
          </button>
        </div>
      </div>

      <Popup open={open === 'wars'} onClose={() => setOpen(null)} title="War record" subtitle={file.title} icon={Icon.swords}>
        {played === 0 ? (
          <p className="gx-empty">No wars on record yet. When this gang fights, the result is logged here.</p>
        ) : (
          <Paged items={record.wars} label="wars">
            {(war) => (
              <li key={war.id} className={`gx-row gx-row--${war.outcome}`}>
                <span className="gx-row__date">{formatDate(war.date)}</span>
                <span className="gx-row__main">
                  <span className="gx-row__name">
                    <span className="gx-row__vs">vs</span>{' '}
                    {war.opponentSlug ? (
                      <Link to={`/gangs/${war.opponentSlug}`} onClick={() => setOpen(null)}>
                        {war.opponent}
                      </Link>
                    ) : (
                      war.opponent
                    )}
                  </span>
                  {war.result && <span className="gx-row__sub">{war.result}</span>}
                </span>
                <span className={`gx-badge gx-badge--${war.outcome}`}>{OUTCOME[war.outcome].label}</span>
              </li>
            )}
          </Paged>
        )}
      </Popup>

      <Popup open={open === 'players'} onClose={() => setOpen(null)} title="Players" subtitle={file.title} icon={Icon.users}>
        {file.members.length === 0 ? (
          <p className="gx-empty">
            {file.reserved ? 'This file is sealed until the administration confirms the gang.' : 'Roster not published yet.'}
          </p>
        ) : (
          <Paged items={file.members.map((m, i) => ({ ...m, n: i + 1 }))} label="players">
            {(member) => {
              const lead = isLeaderRole(member.role) || (member.n === 1 && member.name === file.leader)
              return (
                <li key={`${member.name}-${member.n}`} className={`gx-row gx-row--player ${lead ? 'is-lead' : ''}`}>
                  <span className="gx-mono" aria-hidden="true">
                    {initials(member.name)}
                  </span>
                  <span className="gx-row__main">
                    <span className="gx-row__name">{member.name}</span>
                    <span className="gx-row__sub gx-row__role">
                      {lead && <span className="gx-crown">{Icon.crown}</span>}
                      {member.role ?? 'Member'}
                    </span>
                  </span>
                  <span className="gx-row__num">{formatFileNumber(member.n)}</span>
                </li>
              )
            }}
          </Paged>
        )}
      </Popup>
    </div>
  )
}

/** A gang's small picture: its emblem, else its card image, else its skyline. */
function GangThumb({ file }) {
  return (
    <span className="gx-thumb" aria-hidden="true">
      <Plate image={file.emblem ?? file.image} seed={file.scene.seed} horizon={file.scene.horizon} />
    </span>
  )
}

const DIR = { prev: { word: 'Previous gang', glyph: '‹' }, next: { word: 'Next gang', glyph: '›' } }

/** Big arrow at the side of the title scene; opens out to show the neighbouring gang. */
function GangArrow({ file, dir }) {
  return (
    <Link to={`/gangs/${file.slug}`} className={`gx-arrow gx-arrow--${dir}`} aria-label={`${DIR[dir].word}: ${file.title}`}>
      <span className="gx-arrow__glyph" aria-hidden="true">
        {DIR[dir].glyph}
      </span>
      <span className="gx-arrow__peek" aria-hidden="true">
        <GangThumb file={file} />
        <span className="gx-arrow__text">
          <span className="gx-arrow__dir">{DIR[dir].word}</span>
          <span className="gx-arrow__name">{file.title}</span>
        </span>
      </span>
    </Link>
  )
}

/** The previous / next gang at the bottom of the page, with its picture. */

/** A list shown PAGE_SIZE at a time, with page controls when there's more than one page. */
function Paged({ items, label, children }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const shown = items.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)
  return (
    <>
      <ol role="list" className="gx-rows" key={current}>
        {shown.map(children)}
      </ol>
      {pages > 1 && (
        <nav className="gx-pages" aria-label={`Pages of ${label}`}>
          <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
            «
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === current ? 'is-current' : ''}
              aria-current={i === current ? 'page' : undefined}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages - 1} aria-label="Next page">
            »
          </button>
          <span className="gx-pages__count">
            {current * PAGE_SIZE + 1}–{Math.min(items.length, (current + 1) * PAGE_SIZE)} of {items.length}
          </span>
        </nav>
      )}
    </>
  )
}

/** A pop-up window (native <dialog>: Esc closes it, focus stays inside, the page behind is inert). */
function Popup({ open, onClose, title, subtitle, icon, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    if (open && !dialog.open) {
      dialog.showModal()
      const prev = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prev
      }
    }
    if (!open && dialog.open) dialog.close()
    return undefined
  }, [open])

  return (
    <dialog
      ref={ref}
      className="gx-popup"
      aria-labelledby={`gx-popup-${title}`}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose() // a click on the dimmed backdrop
      }}
    >
      <div className="gx-popup__panel">
        <header className="gx-popup__head">
          <span className="gx-popup__icon">{icon}</span>
          <div>
            <h2 id={`gx-popup-${title}`} className="gx-popup__title">
              {title}
            </h2>
            <p className="gx-popup__sub">{subtitle}</p>
          </div>
          <button type="button" className="gx-popup__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="gx-popup__body">{open && children}</div>
      </div>
    </dialog>
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
