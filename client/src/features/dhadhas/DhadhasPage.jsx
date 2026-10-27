import { useRef } from 'react'
import { Link } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import Arrow from '../../components/ui/Arrow'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, useGSAP } from '../../lib/gsap'
import './dhadhas.css'

const NAME = 'DHADHAS'

/**
 * Dhadhas — a new faction, announced but not yet revealed.
 * The name rises letter by letter, a "coming soon" stamp lands on it, and the name drifts
 * past in the background. With reduced motion everything is simply shown.
 * When the faction is ready, replace this page's content (or turn it off in the panel).
 */
export default function DhadhasPage() {
  usePageTitle('Dhadhas')
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.dhadhas__eyebrow', { y: 12, opacity: 0, duration: 0.6 })
          .from('.dhadhas__letter', { yPercent: 110, duration: 0.9, stagger: 0.06 }, 0.1)
          .from('.dhadhas__stamp', { scale: 1.8, rotation: -24, opacity: 0, duration: 0.45, ease: 'back.out(2.2)' }, 0.85)
          .from('.dhadhas__copy > *', { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 }, 1.0)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="dhadhas" aria-labelledby="dhadhas-title">
      {/* the name drifting past, two rows in opposite directions */}
      <div className="dhadhas__drift" aria-hidden="true">
        {[0, 1].map((row) => (
          <div key={row} className={`dhadhas__row dhadhas__row--${row}`}>
            {Array.from({ length: 2 }, (_, half) => (
              <span key={half}>{`${NAME} · `.repeat(4)}</span>
            ))}
          </div>
        ))}
      </div>

      <div className="dhadhas__inner container">
        <p className="dhadhas__eyebrow">
          <span>Factions</span>
          <span className="dhadhas__dot" aria-hidden="true" />
          <span>New</span>
        </p>

        <div className="dhadhas__lockup">
          <h1 id="dhadhas-title" className="dhadhas__title" aria-label="Dhadhas">
            {[...NAME].map((ch, i) => (
              <span key={i} className="dhadhas__mask" aria-hidden="true">
                <span className="dhadhas__letter">{ch}</span>
              </span>
            ))}
          </h1>
          <span className="dhadhas__stamp">Coming soon</span>
        </div>

        <div className="dhadhas__copy">
          <p className="dhadhas__lede">A new faction is on its way to Rameirah Empire. Who they are and how to join will be announced on our Discord.</p>
          <div className="dhadhas__actions">
            <ApplyLink className="btn btn--primary btn--large">Get updates on Discord</ApplyLink>
            <Link to="/gangs" className="btn btn--ghost btn--large">
              See the gangs <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
