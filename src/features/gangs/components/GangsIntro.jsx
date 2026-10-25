import { useEffect, useRef, useState } from 'react'

import Plate from '../../../components/media/Plate'
import Odometer from '../../../components/ui/Odometer'
import { media, site } from '../../../config/site'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'
import { formatFileNumber } from '../gangsModel'

/**
 * Opening screen of the archive, set like a cinema ticket: the title, an "Admit one" stub,
 * and a counter that rolls from 000 up to the number of files that actually exist.
 * A strip of file numbers runs along the bottom; scrolling away pushes the scene back.
 */
export default function GangsIntro({ files, summary }) {
  const root = useRef(null)
  const [count, setCount] = useState(0)

  // Roll the counter shortly after arrival (immediately for reduced motion — the CSS
  // transition is switched off there, so it simply shows the number).
  useEffect(() => {
    const id = window.setTimeout(() => setCount(summary.total), 650)
    return () => window.clearTimeout(id)
  }, [summary.total])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: 'power4.out' } })
          .from('.g-intro__media', { scale: 1.3, duration: 2.6, ease: 'power3.out' }, 0)
          .from('.g-intro__line > span', { yPercent: 115, duration: 1.3, stagger: 0.12 }, 0.2)
          .from('.g-intro__ticket', { y: 40, rotate: -4, autoAlpha: 0, duration: 1.2 }, 0.55)
          .from('.g-intro__foot > *', { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.08 }, 0.9)

        // Scrolling away: the backdrop sinks slower than the page, the type lifts and fades.
        gsap
          .timeline({
            scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
          })
          .to('.g-intro__media', { yPercent: 18, scale: 1.08, ease: 'none' }, 0)
          .to('.g-intro__title', { yPercent: -30, autoAlpha: 0.15, ease: 'none' }, 0)
          .to('.g-intro__ticket', { yPercent: -60, rotate: 3, ease: 'none' }, 0)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const strip = files.map((f) => `File ${formatFileNumber(f.number)} · ${f.title}`)

  return (
    <section ref={root} className="g-intro theme-black" aria-labelledby="gangs-title">
      <div className="g-intro__media" aria-hidden="true">
        <Plate image={media.gangsOpening.image} seed={311} horizon={0.8} priority />
      </div>
      <div className="g-intro__shade" aria-hidden="true" />

      <div className="container g-intro__body">
        <p className="g-intro__eyebrow">The {site.name} archive</p>
        <h1 id="gangs-title" className="g-intro__title">
          <span className="g-intro__line">
            <span>Gangs</span>
          </span>
          <span className="g-intro__line g-intro__line--sub">
            <span>of the city</span>
          </span>
        </h1>

        <div className="g-intro__ticket" role="group" aria-label="Archive status">
          <div className="g-intro__ticket-main">
            <span className="g-intro__admit">Admit one</span>
            <Odometer value={count} width={3} className="g-intro__count" label="Files in the archive:" />
            <span className="g-intro__count-label">Files in the archive</span>
          </div>
          <dl className="g-intro__ticket-facts">
            <div>
              <dt>Confirmed</dt>
              <dd>{formatFileNumber(summary.confirmed)}</dd>
            </div>
            <div>
              <dt>Reserved</dt>
              <dd>{formatFileNumber(summary.reserved)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{site.launch.isLive ? 'Open' : 'Pre-launch'}</dd>
            </div>
          </dl>
        </div>

        <div className="g-intro__foot">
          <p className="g-intro__note">
            Every family in the city gets its own file. A file opens once the administration
            confirms who they are — nothing here is invented ahead of time.
          </p>
          <p className="g-intro__scroll" aria-hidden="true">
            <span className="g-intro__scroll-line" />
            Scroll to open the files
          </p>
        </div>
      </div>

      <div className="g-intro__marquee" aria-hidden="true">
        <div className="g-intro__marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="g-intro__marquee-set">
              {strip.map((text) => (
                <span key={text}>
                  {text}
                  <i className="g-intro__diamond" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
