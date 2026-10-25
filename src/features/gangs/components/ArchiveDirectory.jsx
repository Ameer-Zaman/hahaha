import { useRef, useState } from 'react'

import CityPlate from '../../../components/media/CityPlate'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'
import { formatFileNumber } from '../gangsModel'

/**
 * The directory: one large typographic row per file. On devices with a fine pointer,
 * hovering a row brings up its image beside the cursor (the editorial "reveal");
 * on touch and with reduced motion the list stands on its own.
 */
export default function ArchiveDirectory({ files }) {
  const root = useRef(null)
  const preview = useRef(null)
  const [active, setActive] = useState(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // Rules draw across as the list enters — one orchestrated reveal for the whole archive.
      mm.add(MOTION_OK, () => {
        gsap.from('.dir-row__rule', {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 1.2,
          stagger: 0.08,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: '.dir-list', start: 'top 75%', once: true },
        })
      })

      mm.add(`${MOTION_OK} and (pointer: fine) and (min-width: 60rem)`, () => {
        const el = preview.current
        if (!el) return undefined
        gsap.set(el, { xPercent: -50, yPercent: -50 })
        const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' })
        const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' })
        const list = root.current.querySelector('.dir-wrap')

        const onMove = (event) => {
          const rect = list.getBoundingClientRect()
          xTo(event.clientX - rect.left)
          yTo(event.clientY - rect.top)
        }
        list.addEventListener('pointermove', onMove)
        return () => list.removeEventListener('pointermove', onMove)
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  const activeFile = files.find((file) => file.key === active)

  return (
    <section ref={root} className="archive-dir theme-dark theme-raised section" aria-labelledby="dir-title">
      <div className="container">
        <div className="archive-dir__head">
          <h2 id="dir-title" className="archive-dir__title">
            The files
          </h2>
          <p className="archive-dir__note">
            {files.some((f) => f.reserved)
              ? 'Reserved files open as gangs are confirmed by the administration.'
              : 'Every file below is confirmed by the administration.'}
          </p>
        </div>

        <div className="dir-wrap" onPointerLeave={() => setActive(null)}>
        <ol role="list" className="dir-list">
          {files.map((file) => (
            <li
              key={file.key}
              className={`dir-row ${file.reserved ? 'is-reserved' : ''} ${active === file.key ? 'is-active' : ''}`}
              onPointerEnter={() => setActive(file.key)}
            >
              <span className="dir-row__rule" aria-hidden="true" />
              <span className="dir-row__num">File {formatFileNumber(file.number)}</span>
              <h3 className="dir-row__name">{file.title}</h3>
              <p className="dir-row__desc">{file.description}</p>
              <span className={`status ${file.reserved ? 'status--pending' : ''} dir-row__status`}>
                {file.reserved ? 'Awaiting confirmation' : file.verified ? 'Confirmed' : 'Unverified'}
              </span>
              {(file.territory || file.established) && (
                <dl className="dir-row__meta">
                  {file.territory && (
                    <div>
                      <dt>Territory</dt>
                      <dd>{file.territory}</dd>
                    </div>
                  )}
                  {file.established && (
                    <div>
                      <dt>Established</dt>
                      <dd>{file.established}</dd>
                    </div>
                  )}
                </dl>
              )}
            </li>
          ))}

        </ol>

        <div className="dir-preview" ref={preview} aria-hidden="true" data-visible={Boolean(activeFile)}>
          {activeFile?.image ? (
            <img src={activeFile.image} alt="" loading="lazy" />
          ) : (
            activeFile && <CityPlate seed={activeFile.number * 97} horizon={0.6} />
          )}
        </div>
        </div>
      </div>
    </section>
  )
}
