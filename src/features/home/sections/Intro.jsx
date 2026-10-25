import { useRef } from 'react'

import Plate from '../../../components/media/Plate'
import { media } from '../../../config/site'
import { intro } from '../../../content/home'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'

/** A statement read line by line as it scrolls into view, then a widescreen establishing shot. */
export default function Intro() {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('.intro__line', {
          opacity: 0.2,
          stagger: 0.4,
          ease: 'none',
          scrollTrigger: { trigger: '.intro__statement', start: 'top 80%', end: 'bottom 45%', scrub: true },
        })
        gsap.fromTo(
          '.intro__plate .plate__media',
          { scale: 1.15 },
          {
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: '.intro__plate', start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} id="intro" className="intro theme-black section" aria-label="Introduction">
      <div className="container">
        <p className="intro__statement">
          {intro.lines.map((line) => (
            <span key={line} className="intro__line">
              {line}{' '}
            </span>
          ))}
        </p>
      </div>
      <figure className="intro__figure">
        <Plate className="intro__plate" image={media.intro.image} seed={42} horizon={0.62} />
        <figcaption className="container intro__caption">{intro.caption}</figcaption>
      </figure>
    </section>
  )
}
