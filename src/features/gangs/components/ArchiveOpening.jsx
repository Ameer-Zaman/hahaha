import { useRef } from 'react'

import Plate from '../../../components/media/Plate'
import { media } from '../../../config/site'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'
import ArchiveTicket from './ArchiveTicket'

/**
 * Opening spread: the title set large against a tall portrait frame, the way a
 * film archive opens on a poster. The frame is unveiled from the bottom on load.
 */
export default function ArchiveOpening({ summary }) {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: 'power4.out' } })
          .from('.archive-open__frame', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'power4.inOut' }, 0)
          .from('.archive-open__frame .plate__media', { scale: 1.25, duration: 2.2 }, 0)
          .from('.archive-open__title > span > span', { yPercent: 110, duration: 1.2, stagger: 0.1 }, 0.5)
          .from('.archive-open__aside > *', { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.1 }, 1)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="archive-open theme-black" aria-labelledby="gangs-title">
      <div className="container archive-open__grid">
        <h1 id="gangs-title" className="archive-open__title">
          <span>
            <span>Gangs</span>
          </span>
          <span className="archive-open__title-sub">
            <span>of the city</span>
          </span>
        </h1>

        <div className="archive-open__frame">
          <Plate image={media.gangsOpening.image} seed={311} horizon={0.86} priority parallax />
        </div>

        <div className="archive-open__aside">
          <p className="archive-open__intro">
            An archive of the families that shape the streets. Each file is opened once the
            administration confirms who they are — nothing here is invented ahead of time.
          </p>
          <ArchiveTicket summary={summary} />
        </div>
      </div>
    </section>
  )
}
