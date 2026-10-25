import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import Plate from '../../../components/media/Plate'
import Arrow from '../../../components/ui/Arrow'
import { media } from '../../../config/site'
import { useSiteMedia } from '../../../lib/publicData'
import { features } from '../../../content/home'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'
import { sectionOf, useSiteSettings } from '../../../lib/siteSettings'

const PLATE_SETTINGS = {
  administration: { seed: 7, horizon: 0.82 },
  gangs: { seed: 88, horizon: 0.7 },
  wars: { seed: 131, horizon: 0.9 },
  rules: { seed: 23, horizon: 0.62 },
}

/**
 * "More than a server" — a wall of film-poster panels.
 *
 * Desktop: four tall panels side by side; the open one widens into a full poster while the
 * others narrow to a number and a vertical title. Phones: the same panels stack as an
 * accordion. Each panel is opened by click / tap / keyboard (← → move between them), and
 * also on hover where a mouse is present — hover is never the only way in.
 */
export default function Features() {
  const root = useRef(null)
  const picked = useSiteMedia()
  const posters = {
    administration: picked.posterAdministration,
    gangs: picked.posterGangs,
    wars: picked.posterWars,
    rules: picked.posterRules,
  }
  const tabs = useRef([])
  const hoverTimer = useRef(0)
  const [chosen, setActive] = useState(0)
  const { sections } = useSiteSettings()
  // panels for sections switched off in the admin panel are left out
  const rows = features.rows.filter((row) => sections[sectionOf(row.to)] !== false)
  const active = Math.min(chosen, Math.max(0, rows.length - 1))

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('.poster', {
          yPercent: 12,
          autoAlpha: 0,
          duration: 1,
          stagger: 0.09,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.posters', start: 'top 80%', once: true },
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const open = (index) => setActive(index)

  // Hover preview for mouse users, with a short delay so sweeping across doesn't flicker.
  const onPointerEnter = (index) => (event) => {
    if (event.pointerType !== 'mouse') return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setActive(index), 140)
  }
  const onPointerLeave = () => clearTimeout(hoverTimer.current)

  const onKeyDown = (index) => (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next =
      event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : (index + step + rows.length) % rows.length
    setActive(next)
    tabs.current[next]?.focus()
  }

  if (rows.length === 0) return null // every section in this block is switched off

  return (
    <section ref={root} className="features theme-dark section" aria-labelledby="features-title">
      <div className="container">
        <header className="features__head">
          <div>
            <p className="eyebrow">{features.eyebrow}</p>
            <h2 id="features-title" className="features__title">
              {features.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
          </div>
          <p className="features__aside">{features.aside}</p>
        </header>

        <ol role="list" className="posters" onPointerLeave={onPointerLeave}>
          {rows.map((row, index) => {
            const isOpen = index === active
            const num = String(index + 1).padStart(2, '0')
            return (
              <li
                key={row.id}
                className={`poster poster--${row.id} ${isOpen ? 'is-open' : ''}`}
                onPointerEnter={onPointerEnter(index)}
              >
                <Plate className="poster__plate" image={posters[row.id] ?? media.features[row.id]} {...PLATE_SETTINGS[row.id]} parallax />
                <div className="poster__shade" aria-hidden="true" />

                <button
                  ref={(el) => (tabs.current[index] = el)}
                  type="button"
                  className="poster__tab"
                  id={`poster-tab-${row.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`poster-panel-${row.id}`}
                  onClick={() => open(index)}
                  onKeyDown={onKeyDown(index)}
                >
                  <span className="poster__num">{num}</span>
                  <span className="poster__label">{row.title}</span>
                  <span className="poster__diamond" aria-hidden="true" />
                </button>

                <div
                  id={`poster-panel-${row.id}`}
                  role="region"
                  aria-labelledby={`poster-tab-${row.id}`}
                  className="poster__body"
                  aria-hidden={!isOpen}
                  inert={!isOpen}
                >
                  <span className="poster__big-num" aria-hidden="true">
                    {num}
                  </span>
                  <h3 className="poster__title">{row.title}</h3>
                  <p className="poster__text">{row.body}</p>
                  <Link to={row.to} className="btn btn--primary poster__cta">
                    {row.cta} <Arrow />
                  </Link>
                </div>
              </li>
            )
          })}
        </ol>

        <ul role="list" className="tags features__tags" aria-label="What the community stands for">
          {features.tags.map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
