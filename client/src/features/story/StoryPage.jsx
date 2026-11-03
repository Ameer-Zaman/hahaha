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

/* -------------------------------------------------------------- chapter */

/**
 * One chapter: a number, a title, the writing in a readable column, and its pictures beside
 * it — the scene, then the two smaller places under it. The column changes side each
 * chapter, which is all the rhythm the page needs.
 */
function Chapter({ ch, index }) {
  return (
    <section className={`sc ${index % 2 ? 'sc--flip' : ''}`} aria-labelledby={`ch-${ch.id}`}>
      <div className="sc__text">
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

      <div className="sc__media">
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

/** A line from the city, between chapters. Quiet: a gold rule, the words, the attribution. */
function Quote({ quote, id }) {
  return (
    <figure className="sq" aria-labelledby={`qs-${id}`}>
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
    <section className="so" aria-labelledby="story-outro-title">
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
 * scroll through. Each chapter is one screen of writing with one picture; the quotes sit
 * between them.
 */
export default function StoryPage() {
  usePageTitle('Story')
  const picked = useSiteMedia()
  const story = chapters.map((ch) => withPanelMedia(ch, picked))

  // one gentle fade as each section arrives; nothing moves when motion is turned down
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      gsap.utils.toArray('.story-reveal').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 24,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
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
        </div>
      </ParallaxScope>

      <div className="story theme-black">
        <div className="container story__inner">
          {story.map((ch, i) => (
            <div key={ch.id} className="story-reveal">
              <Chapter ch={ch} index={i} />
              {ch.quote && <Quote quote={ch.quote} id={ch.id} />}
            </div>
          ))}
          <div className="story-reveal">
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
