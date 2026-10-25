import { useRef } from 'react'
import { Link } from 'react-router-dom'

import Plate from '../../../components/media/Plate'
import { media, site } from '../../../config/site'
import { closing } from '../../../content/home'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'

/**
 * The closing frame mirrors the opening: as the visitor scrolls through it, the letterbox
 * bars draw in from the edges, ending the film on the call to action.
 */
export default function Closing() {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        const st = { trigger: root.current, start: 'top 70%', end: 'bottom bottom', scrub: true }
        gsap.fromTo('.closing__bar', { height: 0 }, { height: '22%', ease: 'none', scrollTrigger: st })
        gsap.fromTo('.closing__plate .plate__media', { scale: 1 }, { scale: 1.1, ease: 'none', scrollTrigger: st })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="closing theme-black" aria-labelledby="closing-title">
      <Plate className="closing__plate" image={media.closing.image} seed={5} horizon={0.78} />
      <div className="closing__bar closing__bar--top" aria-hidden="true" />
      <div className="closing__content container">
        <p className="closing__name">{site.name}</p>
        <h2 id="closing-title" className="closing__title">
          {closing.heading}
        </h2>
        <Link to="/apply" className="btn btn--primary btn--large">
          {closing.cta}
        </Link>
      </div>
      <div className="closing__bar closing__bar--bottom" aria-hidden="true" />
    </section>
  )
}
