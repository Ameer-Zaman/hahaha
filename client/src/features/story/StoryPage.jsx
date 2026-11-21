import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import Arrow from '../../components/ui/Arrow'
import { chapters, storyIntro, storyOutro } from '../../content/story'
import { site } from '../../config/site'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useSiteMedia } from '../../lib/publicData'
import { useSectionOn } from '../../lib/siteSettings'
import LoopMedia from './LoopMedia'
import './story.css'

/** 1 → "01". */
const num = (i) => String(i + 1).padStart(2, '0')

/** Is motion welcome? (Read once; the page is built for one or the other.) */
function useMotion() {
  const [ok] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return ok
}

/* ------------------------------------------------------------------- words */

/**
 * A line set word by word. With motion, each word starts dim and lights up as the line is
 * scrolled through, like a reader's eye moving along it.
 */
function LitWords({ text, as: Tag = 'p', className, id }) {
  return (
    <Tag className={`lit ${className ?? ''}`} id={id}>
      {text.split(/(\s+)/).map((w, i) =>
        /\s/.test(w) ? (
          w
        ) : (
          <span key={i} className="lit__w">
            {w}
          </span>
        ),
      )}
    </Tag>
  )
}

/* ----------------------------------------------------------------- opening */

/** The opening: a black screen, the title spaced wide, the tagline lighting word by word. */
function Opening({ story }) {
  return (
    <section className="so-open" aria-labelledby="story-title">
      <div className="so-open__sticky">
        <p className="so-open__kicker" aria-hidden="true">
          <span>{site.name}</span>
        </p>
        <h1 id="story-title" className="so-open__title">
          Story
        </h1>
        <LitWords text={storyIntro.tagline} className="so-open__line" />
        <nav className="so-open__index" aria-label="Chapters">
          {story.map((ch, i) => (
            <a key={ch.id} href={`#ch-${ch.id}`}>
              <span>{num(i)}</span> {ch.title}
            </a>
          ))}
        </nav>
        <p className="so-open__cue" aria-hidden="true">
          Scroll <i />
        </p>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- chapter */

/**
 * One chapter, played like a scene from a film. The picture fills the screen and stays while
 * you scroll; black bars close in from top and bottom; the chapter's number stands huge
 * behind its title; and the writing comes up one line at a time at the bottom, like
 * subtitles, as you scroll on. The chapter's two smaller pictures drift in as stills.
 *
 * Without motion, it is a picture with the writing under it.
 */
function Chapter({ ch, index, motion, onActive }) {
  const ref = useRef(null)
  const lines = [ch.lead, ...ch.body]
  const [line, setLine] = useState(0)

  useGSAP(
    () => {
      if (!motion) return undefined
      const el = ref.current
      const steps = lines.length
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => setLine(Math.min(steps - 1, Math.floor(self.progress * (steps + 0.15)))),
        onToggle: (self) => self.isActive && onActive(index),
      })
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } })
      tl.fromTo(el.querySelector('.sf__media'), { scale: 1.22 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .fromTo(el.querySelector('.sf__num'), { yPercent: 25 }, { yPercent: -18, ease: 'none', duration: 1 }, 0)
        .fromTo(el.querySelectorAll('.sf__bar'), { scaleY: 0 }, { scaleY: 1, ease: 'power2.out', duration: 0.25 }, 0.25)
      el.querySelectorAll('.sf__still').forEach((still, i) => {
        tl.fromTo(
          still,
          { yPercent: 60 + i * 30, opacity: 0 },
          { yPercent: -20 - i * 25, opacity: 1, ease: 'none', duration: 0.75 },
          0.3 + i * 0.1,
        )
      })
      return () => st.kill()
    },
    { scope: ref, dependencies: [motion] },
  )

  return (
    <section
      ref={ref}
      id={`ch-${ch.id}`}
      className={`sf ${motion ? 'sf--motion' : ''}`}
      style={{ '--steps': lines.length }}
      aria-labelledby={`ch-${ch.id}-title`}
    >
      <div className="sf__sticky">
        <div className="sf__media" aria-hidden="true">
          <LoopMedia video={ch.video} image={ch.image} scene={ch.scene} />
        </div>
        <div className="sf__shade" aria-hidden="true" />
        <span className="sf__bar sf__bar--top" aria-hidden="true" />
        <span className="sf__bar sf__bar--bottom" aria-hidden="true" />

        <p className="sf__num" aria-hidden="true">
          {num(index)}
        </p>
        <header className="sf__head">
          <p className="sf__kicker">{ch.kicker}</p>
          <h2 id={`ch-${ch.id}-title`} className="sf__title">
            {ch.title}
          </h2>
        </header>

        {ch.cards.length > 0 && (
          <div className="sf__stills" aria-hidden="true">
            {ch.cards.map((card, i) => (
              <figure key={i} className={`sf__still sf__still--${i}`}>
                <LoopMedia video={card.video} image={card.image} scene={card.scene} />
              </figure>
            ))}
          </div>
        )}

        <div className="sf__subs">
          {motion ? (
            <>
              {/* every line is in the page for readers and search; the one in play is shown */}
              {lines.map((text, i) => (
                <p key={i} className={`sf__sub ${i === 0 ? 'sf__sub--lead' : ''} ${i === line ? 'is-on' : ''}`} aria-hidden={i !== line}>
                  {text}
                </p>
              ))}
              <p className="sf__count" aria-hidden="true">
                {lines.map((_, i) => (
                  <i key={i} className={i <= line ? 'is-on' : ''} />
                ))}
              </p>
            </>
          ) : (
            lines.map((text, i) => (
              <p key={i} className={`sf__sub is-on ${i === 0 ? 'sf__sub--lead' : ''}`}>
                {text}
              </p>
            ))
          )}
          {ch.link && (
            <SectionLink to={ch.link.to} className={`sf__link ${!motion || line === lines.length - 1 ? 'is-on' : ''}`}>
              {ch.link.label} <Arrow />
            </SectionLink>
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- quote */

/** A line from the city between chapters: a title card, its words lighting as you pass. */
function Quote({ quote, id }) {
  return (
    <figure className="sq" aria-labelledby={`qs-${id}`}>
      <blockquote id={`qs-${id}`} className="sq__words">
        <LitWords text={`“${quote.text}”`} as="span" />
      </blockquote>
      <figcaption className="sq__line">{quote.line}</figcaption>
    </figure>
  )
}

/* ------------------------------------------------------------------- end */

/** The end: the closing words and the way in, like the last card of a film. */
function Ending() {
  return (
    <section className="se" aria-labelledby="story-end-title">
      <p className="se__the-end" aria-hidden="true">
        The end — for now
      </p>
      <h2 id="story-end-title" className="se__title">
        {storyOutro.title}
      </h2>
      <p className="se__body">{storyOutro.body}</p>
      <div className="se__actions">
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

/* -------------------------------------------------------------- the reel */

/** On wide screens: the chapters down the right edge, the one you're in lit. Click to jump. */
function Reel({ story, active }) {
  return (
    <nav className="sr" aria-label="Chapters">
      {story.map((ch, i) => (
        <a key={ch.id} href={`#ch-${ch.id}`} className={i === active ? 'is-on' : ''} aria-current={i === active ? 'true' : undefined}>
          <span className="sr__no">{num(i)}</span>
          <span className="sr__name">{ch.title}</span>
        </a>
      ))}
    </nav>
  )
}

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

/**
 * The Story — told like a film. A black opening with the title and the tagline lighting up
 * word by word; then each chapter as a scene that holds the screen while its lines come up
 * as subtitles; a title card with a line from the city between chapters; and a closing card
 * with the way in. A reel down the right edge shows where you are.
 */
export default function StoryPage() {
  usePageTitle('Story')
  const picked = useSiteMedia()
  const story = chapters.map((ch) => withPanelMedia(ch, picked))
  const motion = useMotion()
  const root = useRef(null)
  const [active, setActive] = useState(-1)

  // words light up as they're scrolled through (opening line and quotes)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray('.lit').forEach((line) => {
          gsap.fromTo(
            line.querySelectorAll('.lit__w'),
            { opacity: 0.14 },
            { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: line, start: 'top 82%', end: 'bottom 45%', scrub: 0.4 } },
          )
        })
        gsap.from('.se > *', {
          opacity: 0,
          y: 30,
          stagger: 0.1,
          duration: 0.8,
          scrollTrigger: { trigger: '.se', start: 'top 75%' },
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  // the reel lights nothing before the first chapter and after the last
  useEffect(() => {
    if (!motion) return undefined
    const st = ScrollTrigger.create({
      trigger: '.se',
      start: 'top 60%',
      onEnter: () => setActive(-1),
      onLeaveBack: () => setActive(story.length - 1),
    })
    return () => st.kill()
  }, [motion, story.length])

  return (
    <div ref={root} className={`story theme-black ${motion ? 'story--motion' : ''}`}>
      <Opening story={story} />
      {story.map((ch, i) => (
        <div key={ch.id} className="story__part">
          <Chapter ch={ch} index={i} motion={motion} onActive={setActive} />
          {ch.quote && <Quote quote={ch.quote} id={ch.id} />}
        </div>
      ))}
      <Ending />
      {motion && <Reel story={story} active={active} />}
    </div>
  )
}

/** A link to another section, left out while that section is switched off in the panel. */
function SectionLink({ to, ...rest }) {
  return useSectionOn(to) ? <Link to={to} {...rest} /> : null
}
