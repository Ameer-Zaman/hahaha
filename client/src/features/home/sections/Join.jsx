import { useRef } from 'react'

import Plate from '../../../components/media/Plate'
import Arrow from '../../../components/ui/Arrow'
import { media } from '../../../config/site'
import { useSiteMedia } from '../../../lib/publicData'
import { join } from '../../../content/home'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'
import ApplyLink from '../../../components/ui/ApplyLink'

/**
 * How to join, set like a mission briefing in an open-world crime game (original design):
 * a street-map backdrop, the headline with its last words on a gold plate, and the steps as
 * objectives joined by a GPS route that draws itself from waypoint to waypoint.
 */
export default function Join() {
  const root = useRef(null)
  const joinImage = useSiteMedia().joinImage ?? media.join.image
  const [lead, small, plate] = join.title

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({
            defaults: { ease: 'power3.out' },
            scrollTrigger: { trigger: '.join__steps', start: 'top 78%', once: true },
          })
          .fromTo('.join__route-live', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0)
          .from('.join-step__pin', { scale: 0, rotate: -90, duration: 0.6, stagger: 0.5, ease: 'back.out(2.2)' }, 0)
          .from('.join-step__card', { y: 36, autoAlpha: 0, duration: 0.8, stagger: 0.5 }, 0.15)
          .from('.join__cta > *', { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, 1.4)

        gsap.from('.join__plate-word', {
          xPercent: -8,
          autoAlpha: 0,
          duration: 0.9,
          ease: 'power4.out',
          scrollTrigger: { trigger: '.join__title', start: 'top 80%', once: true },
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="join theme-dark" aria-labelledby="join-title">
      <div className="join__backdrop" aria-hidden="true">
        <Plate className="join__plate" image={joinImage} alt="" seed={64} horizon={0.72} parallax />
        <div className="join__map" />
      </div>

      <div className="container join__inner">
        <header className="join__head">
          <p className="join__tag">
            <span className="join__tag-dot" aria-hidden="true" />
            {join.eyebrow}
          </p>
          <h2 id="join-title" className="join__title">
            <span className="join__title-line">{lead}</span>
            <span className="join__title-line">
              <span className="join__title-small">{small}</span>{' '}
              <span className="join__plate-word">{plate}</span>
            </span>
          </h2>
        </header>

        <ol className="join__steps">
          {/* the GPS route behind the waypoints (desktop) */}
          <svg className="join__route" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">
            <path className="join__route-base" d="M0 20 C 50 20, 70 20, 100 20 S 200 6, 300 20 S 400 34, 500 20 S 570 20, 600 20" />
            <path
              className="join__route-live"
              d="M0 20 C 50 20, 70 20, 100 20 S 200 6, 300 20 S 400 34, 500 20 S 570 20, 600 20"
              pathLength="1"
            />
          </svg>

          {join.steps.map((step, index) => {
            const n = String(index + 1).padStart(2, '0')
            return (
              <li key={step.title} className="join-step">
                <span className="join-step__pin" aria-hidden="true">
                  <span>{n}</span>
                </span>
                <div className="join-step__card">
                  <p className="join-step__label">Objective {n}</p>
                  <h3 className="join-step__title">{step.title}</h3>
                  <p className="join-step__detail">{step.detail}</p>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="join__cta">
          <ApplyLink className="btn btn--primary btn--large">
            {join.cta} <Arrow />
          </ApplyLink>
          <p className="join__note">
            <span className="join__tag-dot" aria-hidden="true" />
            {join.body}
          </p>
        </div>
      </div>
    </section>
  )
}
