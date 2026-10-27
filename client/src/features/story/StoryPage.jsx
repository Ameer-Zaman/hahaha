import { useRef } from 'react'
import { Link } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import Arrow from '../../components/ui/Arrow'
import BrandMark from '../../components/ui/BrandMark'
import { site } from '../../config/site'
import { chapters, storyIntro, storyOutro } from '../../content/story'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useSiteMedia } from '../../lib/publicData'
import { useSectionOn } from '../../lib/siteSettings'
import LoopMedia from './LoopMedia'
import ScrubMedia from './ScrubMedia'
import './story.css'

/** Scroll progress (0 → 1) of a section, kept in a ref for the video scrubber. */
function useProgress(sectionRef, progressRef) {
  useGSAP(() => {
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progressRef.current = self.progress
      },
    })
    return () => st.kill()
  })
}

/* ---------------------------------------------------------------- intro */

function StoryIntro() {
  const root = useRef(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('.story-intro__mark, .story-intro__name, .story-intro__tagline', {
          opacity: 0,
          y: 30,
          duration: 1.2,
          stagger: 0.12,
          ease: 'power3.out',
        })
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true } })
          .to('.story-intro__brand', { scale: 0.7, opacity: 0, ease: 'none' }, 0)
          .to('.story-intro__tagline', { y: -60, opacity: 0, ease: 'none' }, 0.25)
          .to('.story-intro__cue', { opacity: 0, ease: 'none', duration: 0.2 }, 0)
      })
      return () => mm.revert()
    },
    { scope: root },
  )
  return (
    <section ref={root} className="story-intro" aria-labelledby="story-title">
      <div className="story-intro__stage">
        <div className="story-intro__brand">
          <BrandMark className="story-intro__mark" />
          <p className="story-intro__name">{site.name}</p>
        </div>
        <h1 id="story-title" className="story-intro__tagline story-gradient">
          {storyIntro.tagline}
        </h1>
        <span className="story-intro__cue" aria-hidden="true">
          <svg viewBox="0 0 16 10" width="18" height="11">
            <path d="M1 1l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- chapter */

function Chapter({ ch }) {
  const root = useRef(null)
  const progress = useRef(0)
  useProgress(root, progress)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        // the scene fades up from black, the camera eases back, the title arrives,
        // then the scene dims into a backdrop as the story text scrolls over it
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true } })
          .fromTo('.ch__media', { opacity: 0 }, { opacity: 1, duration: 0.08, ease: 'none' }, 0)
          .fromTo('.ch__media .scrub', { scale: 1.22, yPercent: 4 }, { scale: 1, yPercent: 0, duration: 0.45, ease: 'none' }, 0)
          .fromTo('.ch__titleblock', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0.1)
          .fromTo('.ch__dim', { opacity: 0 }, { opacity: 0.84, duration: 0.15, ease: 'none' }, 0.26)
          // the scene fades almost to black before the next one, so the handover is seamless
          .to('.ch__dim', { opacity: 0.97, duration: 0.12, ease: 'none' }, 0.88)

        // parallax: cards drift at their own speeds
        gsap.utils.toArray('.ch__card', root.current).forEach((card) => {
          const speed = Number(card.dataset.speed || 0)
          gsap.fromTo(
            card,
            { yPercent: -speed },
            { yPercent: speed, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } },
          )
        })
        gsap.utils.toArray('.ch__reveal', root.current).forEach((el) => {
          gsap.from(el, { opacity: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className={`ch ch--${ch.scene?.tint ?? 'gold'}`} aria-labelledby={`ch-${ch.id}`}>
      <div className="ch__stage" aria-hidden="true">
        <div className="ch__media">
          <ScrubMedia video={ch.video} image={ch.image} scene={ch.scene} progress={progress} />
        </div>
        <div className="ch__shade" />
        <div className="ch__dim" />
      </div>

      <div className="ch__flow">
        <div className="ch__open">
          <div className="ch__titleblock">
            <p className="ch__kicker">{ch.kicker}</p>
            <h2 id={`ch-${ch.id}`} className="ch__title">
              {ch.title}
            </h2>
          </div>
        </div>

        <div className="ch__content">
          <div className="ch__text">
            <p className="ch__lead story-gradient ch__reveal">{ch.lead}</p>
            {ch.body.map((para) => (
              <p key={para.slice(0, 20)} className="ch__body ch__reveal">
                {para}
              </p>
            ))}
            {ch.link && (
              <SectionLink to={ch.link.to} className="btn btn--ghost ch__reveal ch__link">
                {ch.link.label} <Arrow />
              </SectionLink>
            )}
          </div>
          <div className="ch__cards">
            {ch.cards.map((card, i) => (
              <figure key={i} className={`ch__card ch__card--${card.shape}`} data-speed={card.speed}>
                <LoopMedia video={card.video} image={card.image} scene={card.scene} />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------- quote scene */

function QuoteScene({ quote, id }) {
  const root = useRef(null)
  const progress = useRef(0)
  useProgress(root, progress)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true } })
          .fromTo('.qs__media', { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'none' }, 0)
          .fromTo('.qs__media .scrub', { scale: 1.18, xPercent: 3 }, { scale: 1.02, xPercent: -2, duration: 1, ease: 'none' }, 0)
          .fromTo('.qs__quote', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }, 0.18)
          .fromTo('.qs__line', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out' }, 0.42)
          .to('.qs__media', { opacity: 0.25, duration: 0.15, ease: 'none' }, 0.85)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="qs" aria-labelledby={`qs-${id}`}>
      <div className="qs__stage">
        <div className="qs__media" aria-hidden="true">
          <ScrubMedia video={quote.video} image={quote.image} scene={quote.scene} progress={progress} />
        </div>
        <div className="qs__shade" aria-hidden="true" />
        <div className="qs__text">
          <blockquote id={`qs-${id}`} className="qs__quote">
            “{quote.text}”
          </blockquote>
          <p className="qs__line story-gradient">{quote.line}</p>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- outro */

function StoryOutro() {
  return (
    <section className="story-outro" aria-labelledby="story-outro-title">
      <h2 id="story-outro-title" className="story-outro__title story-gradient">
        {storyOutro.title}
      </h2>
      <p className="story-outro__body">{storyOutro.body}</p>
      <div className="story-outro__actions">
        <ApplyLink className="btn btn--primary btn--large">
          Apply now <Arrow />
        </ApplyLink>
        <SectionLink to="/rules" className="btn btn--ghost btn--large">
          Read the rules
        </SectionLink>
      </div>
    </section>
  )
}

/**
 * The Story — a long cinematic scroll: an opening statement, then chapters whose full-screen
 * scenes scrub with the scroll, dim into a backdrop under the story text and parallax cards,
 * with full-screen quote moments between them.
 */
/**
 * Videos and images picked in Panel → Story media replace the files named in content/story.js.
 * Each place has a video and an image: a video plays (the image shows while it loads); an image
 * on its own is shown still.
 */
const cap = (id) => id.charAt(0).toUpperCase() + id.slice(1)
function withPanelMedia(ch, picked) {
  const place = (name, base) => {
    if (!base) return base
    const video = picked[`story${cap(ch.id)}${name}Video`] ?? null
    const image = picked[`story${cap(ch.id)}${name}Image`] ?? null
    if (!video && !image) return base
    return { ...base, video: video ?? (image ? null : base.video), image: image ?? base.image }
  }
  return {
    ...place('Scene', ch),
    cards: ch.cards.map((card, i) => place(`Card${'AB'[i] ?? ''}`, card)),
    quote: place('Quote', ch.quote),
  }
}

export default function StoryPage() {
  usePageTitle('Story')
  const picked = useSiteMedia()
  const story = chapters.map((ch) => withPanelMedia(ch, picked))
  return (
    <div className="story">
      <StoryIntro />
      {story.map((ch) => (
        <div key={`${ch.id}|${ch.video}|${ch.image}|${ch.quote?.video}|${ch.quote?.image}`}>
          <Chapter ch={ch} />
          {ch.quote && <QuoteScene quote={ch.quote} id={ch.id} />}
        </div>
      ))}
      <StoryOutro />
    </div>
  )
}

/** A link to another section, left out while that section is switched off in the panel. */
function SectionLink({ to, ...rest }) {
  return useSectionOn(to) ? <Link to={to} {...rest} /> : null
}
