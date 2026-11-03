import { Link } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import Arrow from '../../components/ui/Arrow'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { chapters, storyIntro, storyOutro } from '../../content/story'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, useGSAP } from '../../lib/gsap'
import { useSiteMedia } from '../../lib/publicData'
import { useSectionOn } from '../../lib/siteSettings'
import LoopMedia from './LoopMedia'
import './story.css'

/** 1 → "01". The numerals are set like a magazine's, so they need the leading zero. */
const num = (i) => String(i + 1).padStart(2, '0')

/* -------------------------------------------------------------- contents */

/** A contents strip under the title: where the page goes, and a way to jump there. */
function Contents({ story }) {
  return (
    <nav className="sidx" aria-label="Chapters">
      <ol className="sidx__list">
        {story.map((ch, i) => (
          <li key={ch.id} className="sidx__item">
            <a className="sidx__link" href={`#ch-${ch.id}`}>
              <span className="sidx__n" aria-hidden="true">
                {num(i)}
              </span>
              <span className="sidx__name">{ch.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/* -------------------------------------------------------------- chapter */

/**
 * One chapter. The writing sits in a readable column with an oversized outlined numeral
 * over it; its pictures stack beside it, the second of the pair dropped to break the grid.
 * The column changes side each chapter, which is all the rhythm the page needs.
 */
function Chapter({ ch, index }) {
  return (
    <section className={`sc ${index % 2 ? 'sc--flip' : ''}`} aria-labelledby={`ch-${ch.id}`}>
      <div className="sc__text reveal-item">
        <p className="sc__num" aria-hidden="true">
          {num(index)}
        </p>
        <p className="sc__kicker">{ch.kicker}</p>
        <h2 id={`ch-${ch.id}`} className="sc__title">
          {ch.title}
        </h2>
        <p className="sc__lead">{ch.lead}</p>
        {ch.body.map((para) => (
          <p key={para.slice(0, 24)} className="sc__body">
            {para}
          </p>
        ))}
        {ch.link && (
          <SectionLink to={ch.link.to} className="sc__link">
            {ch.link.label} <Arrow />
          </SectionLink>
        )}
      </div>

      <div className="sc__media reveal-item">
        <figure className="sc__figure">
          <LoopMedia video={ch.video} image={ch.image} scene={ch.scene} />
        </figure>
        {/* the two extra places each chapter can show, filled from Panel → Story media */}
        {ch.cards.length > 0 && (
          <div className="sc__pair">
            {ch.cards.map((card, i) => (
              <figure key={i} className="sc__thumb">
                <LoopMedia video={card.video} image={card.image} scene={card.scene} />
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- quote */

/** A line from the city, between chapters: set large, between two hairlines. */
function Quote({ quote, id }) {
  return (
    <figure className="sq reveal-item" aria-labelledby={`qs-${id}`}>
      <blockquote id={`qs-${id}`} className="sq__words">
        {quote.text}
      </blockquote>
      <figcaption className="sq__line">{quote.line}</figcaption>
    </figure>
  )
}

/* ---------------------------------------------------------------- outro */

function StoryOutro() {
  return (
    <section className="so reveal-item" aria-labelledby="story-outro-title">
      <h2 id="story-outro-title" className="so__title">
        {storyOutro.title}
      </h2>
      <p className="so__body">{storyOutro.body}</p>
      <div className="so__actions">
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
 * The Story — the city explained, in order, as something you read rather than something you
 * scroll through. A contents strip, then three chapters of writing with their pictures, and
 * a line from the city between each.
 */
export default function StoryPage() {
  usePageTitle('Story')
  const picked = useSiteMedia()
  const story = chapters.map((ch) => withPanelMedia(ch, picked))

  // each part arrives as a short stagger; nothing moves when motion is turned down
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      gsap.utils.toArray('.story-reveal').forEach((el) => {
        const bits = el.querySelectorAll('.reveal-item')
        gsap.from(bits.length ? bits : el, {
          opacity: 0,
          y: 28,
          duration: 0.65,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 85%' },
        })
      })
    })
    return () => mm.revert()
  })

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="story-title">
        <ParallaxWord text="Story" motion="x:6%:-10%" className="page-head__word" />
        <div className="container">
          <h1 id="story-title" className="page-head__title">
            Story
          </h1>
          <p className="lede">{storyIntro.tagline}</p>
          <Contents story={story} />
        </div>
      </ParallaxScope>

      <div className="story theme-black">
        <div className="container story__inner">
          {story.map((ch, i) => (
            <div key={ch.id} className="story-reveal story__part">
              <Chapter ch={ch} index={i} />
              {ch.quote && <Quote quote={ch.quote} id={ch.id} />}
            </div>
          ))}
          <div className="story-reveal story__part">
            <StoryOutro />
          </div>
        </div>
      </div>
    </>
  )
}

/** A link to another section, left out while that section is switched off in the panel. */
function SectionLink({ to, ...rest }) {
  return useSectionOn(to) ? <Link to={to} {...rest} /> : null
}
