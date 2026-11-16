import { useEffect, useMemo, useRef } from 'react'
import '@fontsource/cinzel/latin-600.css'
import '@fontsource/cinzel/latin-800.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'

import ApplyLink from '../../components/ui/ApplyLink'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { usePublic } from '../../lib/publicData'
import Seal from './Seal'
import './dhadhas.css'

const NAME = 'DHADHAS'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/** What the page says about recruiting, by the status chosen in Panel → Dhadhas. */
const STATUS = {
  soon: {
    chip: 'Recruitment opens soon',
    title: 'The doors open soon',
    text: 'Recruitment hasn’t started yet. The call goes out on our Discord first.',
  },
  open: {
    chip: 'Recruiting now',
    title: 'The doors are open',
    text: 'The Dhadhas are taking new members. Read what it takes, then apply.',
  },
  invite: {
    chip: 'By invitation only',
    title: 'By invitation only',
    text: 'Members join by invitation. Below is what the family looks for.',
  },
  closed: {
    chip: 'Not recruiting',
    title: 'The doors are closed',
    text: 'The Dhadhas aren’t recruiting right now. Follow the Discord to hear when that changes.',
  },
}

/**
 * Dhadhas — the clan's own page, in its own colours: oxblood, old gold and black.
 *
 *   the seal       a gold seal (the clan's emblem, or the built-in mark) that tilts towards the
 *                  pointer, the name in carved capitals, the motto and where recruiting stands
 *   who we are     a short story
 *   the oath       the clan's code, numbered I, II, III…
 *   the chain      the ranks from the top down
 *   the family     every member, grouped by rank
 *   joining        what it takes and where to apply
 *
 * Everything comes from Panel → Dhadhas; parts left empty don't show, and with nothing filled in
 * the page is just the seal and a "coming soon" line.
 */
export default function DhadhasPage() {
  usePageTitle('Dhadhas')
  const entry = usePublic('/dhadhas')
  const clan = entry.status === 'ok' ? entry.data : null
  const status = STATUS[clan?.status] ? clan.status : 'soon'
  const filled = !!clan && !!(clan.motto || clan.about || clan.creed?.length || clan.ranks?.length || clan.members?.length)

  const root = useRef(null)

  // the entrance, once: the seal turns in, the name rises letter by letter
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.dh-seal', { scale: 0.6, rotation: -40, opacity: 0, duration: 1.4, ease: 'expo.out' })
          .from('.dh-hero__eyebrow', { y: 10, opacity: 0, duration: 0.6 }, 0.2)
          .from('.dh-hero__the', { y: 14, opacity: 0, duration: 0.6 }, 0.55)
          .from('.dh-hero__letter', { yPercent: 115, duration: 1, stagger: 0.07 }, 0.5)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  // the sections below come in as they scroll into view (set up again when the content changes)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.utils
          .toArray('.dh-reveal')
          .forEach((el) =>
            gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%' } }),
          )
        gsap.utils.toArray('.dh-vow').forEach((el) => {
          const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 84%' } })
          tl.from(el.querySelector('.dh-vow__rule'), { scaleX: 0, duration: 1.1, ease: 'power2.inOut' })
            .from(el.querySelector('.dh-vow__num'), { x: -24, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.15)
            .from(el.querySelector('.dh-vow__text'), { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.25)
        })
        const chain = root.current?.querySelector('.dh-chain__line')
        if (chain)
          gsap.from(chain, {
            scaleY: 0,
            transformOrigin: 'top',
            duration: 1.8,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: '.dh-chain', start: 'top 75%' },
          })
        gsap.utils.toArray('.dh-rank').forEach((el) =>
          gsap.from(el, {
            x: el.classList.contains('dh-rank--right') ? 40 : -40,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' },
          }),
        )
        ScrollTrigger.batch('.dh-card', {
          start: 'top 90%',
          onEnter: (cards) => gsap.from(cards, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
        })
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [filled, clan?.members?.length, clan?.ranks?.length, clan?.creed?.length], revertOnUpdate: true },
  )

  // the photos load after the layout: let the scroll animations measure again
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 600)
    return () => clearTimeout(t)
  }, [clan])

  return (
    <div ref={root} className="dh">
      <Hero clan={clan} filled={filled} status={status} loading={entry.status === 'loading'} />
      {filled && clan.about && <About text={clan.about} />}
      {filled && clan.creed?.length > 0 && <Oath lines={clan.creed} />}
      {filled && clan.ranks?.length > 0 && <Chain ranks={clan.ranks} members={clan.members ?? []} />}
      {filled && clan.members?.length > 0 && <Family ranks={clan.ranks ?? []} members={clan.members} />}
      {filled && <Join status={status} requirements={clan.requirements ?? []} applyUrl={clan.applyUrl} />}
    </div>
  )
}

/* ------------------------------------------------------------------ the seal */

function Hero({ clan, filled, status, loading }) {
  return (
    <section className="dh-hero" aria-labelledby="dh-title">
      <div className="dh-hero__smoke" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Embers />
      <div className="dh-hero__inner container">
        <p className="dh-hero__eyebrow">
          <span>Factions</span>
          <Diamond />
          <span>Clan</span>
        </p>

        <Seal emblem={clan?.crest ?? null} />

        <p className="dh-hero__the" aria-hidden="true">
          The
        </p>
        <h1 id="dh-title" className="dh-hero__name" aria-label="The Dhadhas">
          {[...NAME].map((ch, i) => (
            <span key={i} className="dh-hero__mask" aria-hidden="true">
              <span className="dh-hero__letter">{ch}</span>
            </span>
          ))}
        </h1>

        {/* shown once the page knows what to say (fades up by itself, see .dh-hero__after) */}
        {!loading && (
          <div className="dh-hero__after">
            {filled && clan.motto ? (
              <p className="dh-hero__motto">“{clan.motto}”</p>
            ) : (
              !filled && (
                <p className="dh-hero__motto dh-hero__motto--soon">
                  A new clan is rising in Rameirah Empire. Who they are and how to join will be announced on our Discord.
                </p>
              )
            )}
            <div className="dh-hero__row">
              <span className={`dh-status dh-status--${filled ? status : 'soon'}`}>
                <span className="dh-status__dot" aria-hidden="true" />
                {filled ? STATUS[status].chip : 'Coming soon'}
              </span>
              {filled ? (
                <a className="dh-btn dh-btn--ghost" href={clan.members?.length ? '#dh-family' : '#dh-join'}>
                  {clan.members?.length ? 'Meet the family' : 'How to join'}
                </a>
              ) : (
                <ApplyLink className="dh-btn">Get updates on Discord</ApplyLink>
              )}
            </div>
          </div>
        )}
      </div>
      {filled && <span className="dh-hero__scroll" aria-hidden="true" />}
    </section>
  )
}

/** Sparks drifting up through the smoke. Decoration only; still with reduced motion. */
/** Where each spark starts, how big and how fast: fixed, so every visit looks the same. */
const SPARKS = (() => {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 22 }, () => ({
    left: `${(rnd() * 100).toFixed(1)}%`,
    size: `${(2 + rnd() * 3).toFixed(1)}px`,
    delay: `${(-rnd() * 14).toFixed(1)}s`,
    dur: `${(9 + rnd() * 9).toFixed(1)}s`,
    drift: `${((rnd() - 0.5) * 120).toFixed(0)}px`,
  }))
})()

function Embers() {
  const sparks = SPARKS
  return (
    <div className="dh-embers" aria-hidden="true">
      {sparks.map((s, i) => (
        <span
          key={i}
          style={{ left: s.left, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.dur, '--drift': s.drift }}
        />
      ))}
    </div>
  )
}

function Diamond() {
  return (
    <svg className="dh-diamond" viewBox="0 0 10 10" width="8" height="8" aria-hidden="true">
      <path d="M5 0 10 5 5 10 0 5Z" fill="currentColor" />
    </svg>
  )
}

/** A section's small heading: an ornament, a word in caps, an ornament. */
function Kicker({ children }) {
  return (
    <p className="dh-kicker">
      <span className="dh-kicker__line" aria-hidden="true" />
      <Diamond />
      <span>{children}</span>
      <Diamond />
      <span className="dh-kicker__line" aria-hidden="true" />
    </p>
  )
}

/* ------------------------------------------------------------------ who we are */

function About({ text }) {
  const paragraphs = text.split(/\n{2,}|\n/).filter((p) => p.trim())
  return (
    <section className="dh-about" aria-labelledby="dh-about-title">
      <div className="container dh-about__inner">
        <div className="dh-reveal">
          <Kicker>Who we are</Kicker>
          <h2 id="dh-about-title" className="dh-title">
            The family behind the name
          </h2>
        </div>
        <div className="dh-about__text dh-reveal">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the oath */

function Oath({ lines }) {
  return (
    <section className="dh-oath" aria-labelledby="dh-oath-title">
      <div className="container">
        <div className="dh-reveal dh-center">
          <Kicker>The oath</Kicker>
          <h2 id="dh-oath-title" className="dh-title">
            Sworn by every Dhadha
          </h2>
        </div>
        <ol className="dh-oath__list" role="list">
          {lines.map((line, i) => (
            <li key={i} className="dh-vow">
              <span className="dh-vow__rule" aria-hidden="true" />
              <span className="dh-vow__num" aria-hidden="true">
                {ROMAN[i]}
              </span>
              <p className="dh-vow__text">
                <span className="visually-hidden">{i + 1}. </span>
                {line}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the chain of ranks */

function Chain({ ranks, members }) {
  const count = (title) => members.filter((m) => m.rank === title).length
  return (
    <section className="dh-chain-sec" aria-labelledby="dh-chain-title">
      <div className="container">
        <div className="dh-reveal dh-center">
          <Kicker>The chain</Kicker>
          <h2 id="dh-chain-title" className="dh-title">
            Every link holds
          </h2>
          <p className="dh-sub">The ranks of the Dhadhas, from the top down.</p>
        </div>
        <ol className="dh-chain" role="list">
          <span className="dh-chain__line" aria-hidden="true" />
          {ranks.map((r, i) => {
            const n = count(r.title)
            return (
              <li key={i} className={`dh-rank dh-rank--${i % 2 ? 'right' : 'left'}`}>
                <span className="dh-rank__link" aria-hidden="true">
                  {ROMAN[i]}
                </span>
                <div className="dh-rank__plate">
                  <h3 className="dh-rank__title">{r.title}</h3>
                  {r.line && <p className="dh-rank__line">{r.line}</p>}
                  {members.length > 0 && (
                    <p className="dh-rank__count">
                      {n} {n === 1 ? 'member' : 'members'}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the family */

function Family({ ranks, members }) {
  const groups = useMemo(() => {
    const known = ranks.map((r) => r.title)
    const out = ranks.map((r) => ({ title: r.title, people: members.filter((m) => m.rank === r.title) })).filter((g) => g.people.length)
    const rest = members.filter((m) => !known.includes(m.rank))
    if (rest.length) out.push({ title: out.length ? 'Members' : '', people: rest })
    return out
  }, [ranks, members])

  return (
    <section id="dh-family" className="dh-family" aria-labelledby="dh-family-title">
      <div className="container">
        <div className="dh-reveal dh-center">
          <Kicker>The family</Kicker>
          <h2 id="dh-family-title" className="dh-title">
            The Dhadhas
          </h2>
          <p className="dh-sub">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title || 'all'} className="dh-family__group">
            {g.title && (
              <h3 className="dh-family__rank dh-reveal">
                <span>{g.title}</span>
              </h3>
            )}
            <ul className="dh-family__grid" role="list">
              {g.people.map((m) => (
                <li key={m.name} className="dh-card">
                  <div className="dh-card__arch">
                    {m.photo ? (
                      <img src={m.photo} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="dh-card__initial" aria-hidden="true">
                        {[...m.name.trim()][0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="dh-card__plate">
                    <p className="dh-card__name">{m.name}</p>
                    {m.rank && <p className="dh-card__rank">{m.rank}</p>}
                    {m.line && <p className="dh-card__line">{m.line}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ joining */

function Join({ status, requirements, applyUrl }) {
  const s = STATUS[status]
  const canApply = status === 'open'
  return (
    <section id="dh-join" className="dh-join" aria-labelledby="dh-join-title">
      <div className="container dh-join__inner">
        <div className="dh-join__call dh-reveal">
          <Kicker>Joining</Kicker>
          <h2 id="dh-join-title" className="dh-title">
            {s.title}
          </h2>
          <p className="dh-join__text">{s.text}</p>
          <div className="dh-join__actions">
            {canApply && applyUrl ? (
              <a className="dh-btn" href={applyUrl} target="_blank" rel="noopener noreferrer">
                Apply to the Dhadhas
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ) : (
              <ApplyLink className={canApply ? 'dh-btn' : 'dh-btn dh-btn--ghost'}>
                {canApply ? 'Apply on Discord' : 'Follow on Discord'}
              </ApplyLink>
            )}
          </div>
        </div>
        {requirements.length > 0 && (
          <div className="dh-join__card dh-reveal">
            <h3 className="dh-join__card-title">What it takes</h3>
            <ul className="dh-join__list" role="list">
              {requirements.map((r, i) => (
                <li key={i}>
                  <Diamond />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
