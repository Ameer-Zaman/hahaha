import { useRef } from 'react'
import '@fontsource/mr-dafoe/latin-400.css'

import Plate from '../../../components/media/Plate'
import BackgroundVideo from '../../../components/media/BackgroundVideo'
import Arrow from '../../../components/ui/Arrow'
import { media, site } from '../../../config/site'
import { hero } from '../../../content/home'
import { gsap, MOTION_OK, useGSAP } from '../../../lib/gsap'
import { whenEntered } from '../../../lib/intro'
import ApplyLink from '../../../components/ui/ApplyLink'

/**
 * Full-screen opening: the community name set huge in the top-left, a short pitch and
 * the application call to action. Content is visible without JavaScript; the entrance
 * only sets starting states at runtime and never runs with reduced motion.
 */
export default function Hero() {
  const root = useRef(null)
  const words = site.name.split(/\s+/)
  const hasTrailer = Boolean(media.trailer.youtubeUrl)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      let stopWaiting = () => {}
      mm.add(MOTION_OK, () => {
        // Held until the visitor walks through the welcome screen (plays at once otherwise).
        const intro = gsap
          .timeline({ paused: true, defaults: { ease: 'power4.out' } })
          .from('.hero__plate .plate__media', { scale: 1.12, duration: 2.4, ease: 'power2.out' }, 0)
          .from('.hero__word > span', { yPercent: 140, duration: 1.1, stagger: 0.09 }, 0.15)
          // the sign powers on once the name is in place
          .add(() => root.current?.classList.add('is-lit'), 1.25)
          .from('.hero__reveal', { autoAlpha: 0, y: 18, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.7)
        stopWaiting = whenEntered(() => intro.play())

        // Background layers sink behind the content as the hero scrolls away.
        gsap.to(['.hero__plate .plate__media', '.yt-bg'], {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
      })
      return () => {
        stopWaiting()
        mm.revert()
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} className="hero theme-black" aria-labelledby="hero-title">
      <Plate
        className="hero__plate"
        image={media.hero.image}
        seed={19}
        horizon={0.66}
        priority
        parallax
      />
      {media.hero.video && (
        <BackgroundVideo src={media.hero.video} poster={media.hero.videoPoster} label="Shyastha city footage" controls={false} />
      )}
      <div className="hero__shade" aria-hidden="true" />

      <div className="hero__content container">
        {/* Neon sign: the name in glowing gold script with a white tube underneath
            (an original 80s-Miami neon treatment, not any game's logo). */}
        <h1 id="hero-title" className="hero__title hero__title--neon">
          {words.map((word) => (
            <span key={word} className="hero__word">
              <span className="hero__neon">{word}</span>
            </span>
          ))}
          <svg className="hero__tube" viewBox="0 0 420 40" aria-hidden="true" preserveAspectRatio="none">
            <path d="M6 30 C 90 8, 210 4, 300 14 S 400 30, 414 12" pathLength="1" />
          </svg>
        </h1>


        <div className="hero__actions hero__reveal">
          <ApplyLink className="btn btn--primary btn--large">
            {hero.primary} <Arrow />
          </ApplyLink>
          {hasTrailer ? (
            <a href={media.trailer.youtubeUrl} className="btn btn--ghost btn--large" target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true">▶</span> {hero.secondaryTrailer}
            </a>
          ) : (
            <a href="#welcome" className="btn btn--ghost btn--large">
              {hero.secondaryExplore}
            </a>
          )}
        </div>
      </div>

      <a href="#welcome" className="hero__scroll">
        <span>Scroll</span>
        <svg viewBox="0 0 16 10" width="14" height="9" aria-hidden="true">
          <path d="M1 1l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </a>
    </section>
  )
}
