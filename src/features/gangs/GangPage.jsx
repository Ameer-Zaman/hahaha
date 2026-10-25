import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import Plate from '../../components/media/Plate'
import RollText from '../../components/ui/RollText'
import Arrow from '../../components/ui/Arrow'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, useGSAP } from '../../lib/gsap'
import { formatFileNumber, getArchiveFiles } from './gangsModel'
import './gangs.css'

const files = getArchiveFiles()

const OUTCOME_LABEL = { win: 'Won', loss: 'Lost', draw: 'Drawn' }

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * A gang's own page, kept minimal: a banner with the name, three facts, then the war record
 * and the player list side by side. Everything comes from the confirmed data; anything not
 * supplied yet says so in one quiet line. Player names are plain text (no profile pages).
 */
export default function GangPage() {
  const { slug } = useParams()
  const index = files.findIndex((f) => f.slug === slug)
  const file = index >= 0 ? files[index] : null
  usePageTitle(file ? file.title : 'Gang not found')

  if (!file) return <GangNotFound />

  const prev = files[(index - 1 + files.length) % files.length]
  const next = files[(index + 1) % files.length]
  return <GangDetail key={file.slug} file={file} prev={prev} next={next} total={files.length} />
}

function GangDetail({ file, prev, next, total }) {
  const root = useRef(null)
  const [rolled, setRolled] = useState(false)
  const { record } = file

  useEffect(() => {
    const id = window.setTimeout(() => setRolled(true), 200)
    return () => window.clearTimeout(id)
  }, [])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('.gp__banner', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out' })
        gsap.from('.gp__facts > div, .gp__block', { y: 20, opacity: 0, duration: 0.7, stagger: 0.07, delay: 0.25, ease: 'power3.out' })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} className="gp">
      <div className="container gp__inner">
        <Link to="/gangs" state={{ focus: file.slug }} className="gp__back">
          <span aria-hidden="true">«</span> All gangs
        </Link>

        <header className="gp__head">
          <div className={`gp__banner reel-card--${file.scene.tint}`}>
            <div className="gp__media" aria-hidden="true">
              <Plate image={file.image} seed={file.scene.seed} horizon={file.scene.horizon} priority />
            </div>
            <div className="reel-card__tint" aria-hidden="true" />
            <div className="gp__shade" aria-hidden="true" />
            {file.demo && <span className="demo-tag">Demo data — not real</span>}
            <div className="gp__title-wrap">
              <p className="gp__label">
                {file.type} · {formatFileNumber(file.number)} / {formatFileNumber(total)}
              </p>
              <h1 className="gp__title">
                <RollText text={file.title} rolled={rolled} />
              </h1>
            </div>
          </div>

          <dl className="gp__facts">
            <div>
              <dt>Leader</dt>
              <dd>{file.leader}</dd>
            </div>
            <div>
              <dt>Territory</dt>
              <dd>{file.territory}</dd>
            </div>
            <div>
              <dt>Established</dt>
              <dd>{file.established}</dd>
            </div>
          </dl>
          {!file.reserved && file.description && <p className="gp__about">{file.description}</p>}
        </header>

        <div className="gp__grid">
          {/* War record */}
          <section className="gp__block" aria-labelledby="gp-wars">
            <div className="gp__block-head">
              <h2 id="gp-wars" className="gp__h">
                War record
              </h2>
              {record.wars.length > 0 && (
                <p className="gp__tally">
                  <span>{record.wins}W</span>
                  <span>{record.losses}L</span>
                  <span>{record.draws}D</span>
                </p>
              )}
            </div>
            {record.wars.length === 0 ? (
              <p className="gp__empty">No wars recorded yet.</p>
            ) : (
              <ul role="list" className="gp__list">
                {record.wars.map((war) => (
                  <li key={war.id} className="gp__row gp__row--war">
                    <span className="gp__date">{formatDate(war.date)}</span>
                    <span className="gp__name">
                      vs{' '}
                      {war.opponentSlug ? <Link to={`/gangs/${war.opponentSlug}`}>{war.opponent}</Link> : war.opponent}
                    </span>
                    <span className={`gp__outcome gp__outcome--${war.outcome}`}>{OUTCOME_LABEL[war.outcome]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Players */}
          <section className="gp__block" aria-labelledby="gp-players">
            <div className="gp__block-head">
              <h2 id="gp-players" className="gp__h">
                Players
              </h2>
              {file.members.length > 0 && <p className="gp__tally">{file.members.length}</p>}
            </div>
            {file.members.length === 0 ? (
              <p className="gp__empty">Roster not published yet.</p>
            ) : (
              <ol role="list" className="gp__list">
                {file.members.map((member, i) => (
                  <li key={`${member.name}-${i}`} className="gp__row">
                    <span className="gp__num">{formatFileNumber(i + 1)}</span>
                    <span className="gp__name">{member.name}</span>
                    <span className="gp__role">{member.role ?? 'Member'}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {total > 1 && (
          <nav className="gp__pager" aria-label="Other gangs">
            <Link to={`/gangs/${prev.slug}`}>
              <span aria-hidden="true">«</span> {prev.title}
            </Link>
            <Link to={`/gangs/${next.slug}`}>
              {next.title} <span aria-hidden="true">»</span>
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
