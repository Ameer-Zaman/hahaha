import { useRef } from 'react'

import Plate from '../../../components/media/Plate'
import BackgroundVideo from '../../../components/media/BackgroundVideo'
import { media } from '../../../config/site'
import { useSiteMedia } from '../../../lib/publicData'
import { welcome } from '../../../content/home'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'

/**
 * The "Welcome to the city" banner: the city video from public/assets/video/welcome.mp4
 * plays muted behind the title (no player buttons), with a button to watch it on YouTube
 * with sound. If the file isn't there yet, the illustrated skyline stays.
 */
export default function Welcome() {
  const root = useRef(null)
  const { youtubeUrl, credit } = media.trailer
  const video = useSiteMedia().welcomeVideo ?? media.trailer.video

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          '.welcome__progress span',
          { scaleX: 0 },
          { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 80%', end: 'bottom 30%', scrub: true } },
        )
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} id="welcome" className="welcome theme-black" aria-labelledby="welcome-title">
      <Plate className="welcome__plate" image={media.trailer.image} seed={42} horizon={0.78} parallax />
      {video && <BackgroundVideo key={video} src={video} label="City footage" controls={false} />}
      <div className="welcome__shade" aria-hidden="true" />
      <div className="container welcome__inner">
        <div className="welcome__text">
          <p className="eyebrow">{welcome.eyebrow}</p>
          <h2 id="welcome-title" className="welcome__title">
            {welcome.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
        </div>

        {youtubeUrl && (
          <div className="welcome__watch">
            <a className="btn btn--ghost btn--large welcome__yt" href={youtubeUrl} target="_blank" rel="noopener noreferrer">
              <svg className="welcome__yt-icon" viewBox="0 0 28 20" aria-hidden="true">
                <rect width="28" height="20" rx="5" fill="currentColor" />
                <path d="M11 5.5v9l8-4.5z" fill="#0b0b0b" />
              </svg>
              {welcome.watchLabel}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            {credit && <p className="welcome__credit">{credit}</p>}
          </div>
        )}
      </div>
      <div className="welcome__progress container" aria-hidden="true">
        <span />
      </div>
    </section>
  )
}
